from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
import os
import json
from datetime import datetime, date
import pytesseract
from PIL import Image
import pdf2image
import re
from difflib import SequenceMatcher

from src.models.user import db

invoice_bp = Blueprint('invoice', __name__)

# Configuration pour l'upload de fichiers
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'gif'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_image(image_path):
    """Extrait le texte d'une image avec Tesseract OCR"""
    try:
        image = Image.open(image_path)
        text = pytesseract.image_to_string(image, lang='fra+eng')
        return text
    except Exception as e:
        current_app.logger.error(f"Erreur OCR: {e}")
        return ""

def extract_text_from_pdf(pdf_path):
    """Extrait le texte d'un PDF"""
    try:
        pages = pdf2image.convert_from_path(pdf_path)
        text = ""
        for page in pages:
            text += pytesseract.image_to_string(page, lang='fra+eng') + "\n"
        return text
    except Exception as e:
        current_app.logger.error(f"Erreur extraction PDF: {e}")
        return ""

def parse_invoice_text(text):
    """Parse le texte extrait pour identifier les éléments de facture"""
    lines = text.split('\n')
    
    # Patterns de reconnaissance
    invoice_number_pattern = r'(?:facture|invoice|n°|no\.?|number)\s*:?\s*([A-Z0-9\-]+)'
    date_pattern = r'(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})'
    price_pattern = r'(\d+[,\.]\d{2})\s*€?'
    
    # Extraction des informations principales
    invoice_data = {
        'invoice_number': '',
        'date': None,
        'supplier_name': '',
        'total_amount': 0.0,
        'lines': []
    }
    
    # Recherche du numéro de facture
    for line in lines[:10]:  # Chercher dans les 10 premières lignes
        match = re.search(invoice_number_pattern, line, re.IGNORECASE)
        if match:
            invoice_data['invoice_number'] = match.group(1)
            break
    
    # Recherche de la date
    for line in lines[:15]:
        match = re.search(date_pattern, line)
        if match:
            try:
                date_str = match.group(1)
                # Essayer différents formats de date
                for fmt in ['%d/%m/%Y', '%d-%m-%Y', '%d.%m.%Y', '%d/%m/%y']:
                    try:
                        invoice_data['date'] = datetime.strptime(date_str, fmt).date()
                        break
                    except ValueError:
                        continue
                if invoice_data['date']:
                    break
            except:
                continue
    
    # Extraction des lignes d'articles (logique simplifiée)
    for i, line in enumerate(lines):
        line = line.strip()
        if not line:
            continue
            
        # Recherche de prix dans la ligne
        prices = re.findall(price_pattern, line)
        if prices and len(line) > 10:  # Ligne avec prix et description suffisante
            # Calcul de confiance basique
            confidence = 0.5
            if re.search(r'\d+', line):  # Contient des chiffres (quantité)
                confidence += 0.2
            if len(line.split()) > 2:  # Description avec plusieurs mots
                confidence += 0.2
            if any(word in line.lower() for word in ['kg', 'pièce', 'litre', 'unité']):
                confidence += 0.1
            
            invoice_data['lines'].append({
                'raw_description': line,
                'total_price': float(prices[-1].replace(',', '.')),
                'ocr_confidence': min(confidence, 1.0)
            })
    
    return invoice_data

def find_similar_products(description, threshold=0.6):
    """Trouve des produits similaires dans la base de données"""
    products = Product.query.all()
    suggestions = []
    
    for product in products:
        similarity = SequenceMatcher(None, description.lower(), product.name.lower()).ratio()
        if similarity >= threshold:
            suggestions.append({
                'product': product.to_dict(),
                'similarity': similarity
            })
    
    return sorted(suggestions, key=lambda x: x['similarity'], reverse=True)

@invoice_bp.route('/upload', methods=['POST'])
def upload_invoice():
    """Upload et traitement OCR d'une facture"""
    if 'file' not in request.files:
        return jsonify({'error': 'Aucun fichier fourni'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'Aucun fichier sélectionné'}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
        filename = timestamp + filename
        
        # Créer le dossier d'upload s'il n'existe pas
        upload_path = os.path.join(current_app.root_path, UPLOAD_FOLDER)
        os.makedirs(upload_path, exist_ok=True)
        
        file_path = os.path.join(upload_path, filename)
        file.save(file_path)
        
        # Extraction du texte selon le type de fichier
        if filename.lower().endswith('.pdf'):
            extracted_text = extract_text_from_pdf(file_path)
        else:
            extracted_text = extract_text_from_image(file_path)
        
        # Parse des données de facture
        invoice_data = parse_invoice_text(extracted_text)
        
        # Calcul de confiance globale
        if invoice_data['lines']:
            global_confidence = sum(line['ocr_confidence'] for line in invoice_data['lines']) / len(invoice_data['lines'])
        else:
            global_confidence = 0.0
        
        # Enrichissement avec suggestions de produits
        for line in invoice_data['lines']:
            suggestions = find_similar_products(line['raw_description'])
            line['suggested_products'] = suggestions[:3]  # Top 3 suggestions
            line['product_match_confidence'] = suggestions[0]['similarity'] if suggestions else 0.0
        
        return jsonify({
            'success': True,
            'file_path': file_path,
            'extracted_text': extracted_text,
            'parsed_data': invoice_data,
            'global_confidence': global_confidence
        })
    
    return jsonify({'error': 'Type de fichier non autorisé'}), 400

@invoice_bp.route('/save', methods=['POST'])
def save_invoice():
    """Sauvegarde une facture validée en base de données"""
    data = request.get_json()
    
    try:
        # Créer ou récupérer le fournisseur
        supplier_name = data.get('supplier_name', 'Fournisseur inconnu')
        supplier = Supplier.query.filter_by(name=supplier_name).first()
        if not supplier:
            supplier = Supplier(name=supplier_name)
            db.session.add(supplier)
            db.session.flush()  # Pour obtenir l'ID
        
        # Créer la facture
        invoice = Invoice(
            invoice_number=data.get('invoice_number', ''),
            invoice_date=datetime.strptime(data['invoice_date'], '%Y-%m-%d').date() if data.get('invoice_date') else date.today(),
            supplier_id=supplier.id,
            total_amount=data.get('total_amount', 0.0),
            currency=data.get('currency', 'EUR'),
            status='validated',
            ocr_confidence=data.get('global_confidence', 0.0),
            file_path=data.get('file_path', '')
        )
        db.session.add(invoice)
        db.session.flush()
        
        # Créer les lignes de facture
        for line_data in data.get('lines', []):
            # Créer ou récupérer le produit
            product_id = line_data.get('product_id')
            if not product_id and line_data.get('new_product_name'):
                # Créer un nouveau produit
                product = Product(
                    name=line_data['new_product_name'],
                    category=line_data.get('new_product_category', ''),
                    unit=line_data.get('new_product_unit', '')
                )
                db.session.add(product)
                db.session.flush()
                product_id = product.id
            
            invoice_line = InvoiceLine(
                invoice_id=invoice.id,
                product_id=product_id,
                raw_description=line_data['raw_description'],
                quantity=line_data.get('quantity', 1.0),
                unit_price=line_data.get('unit_price', 0.0),
                total_price=line_data.get('total_price', 0.0),
                ocr_confidence=line_data.get('ocr_confidence', 0.0),
                validation_status='validated',
                validated_by='user',  # À adapter selon l'authentification
                validated_at=datetime.utcnow(),
                product_match_confidence=line_data.get('product_match_confidence', 0.0)
            )
            db.session.add(invoice_line)
            db.session.flush()
            
            # Créer l'entrée d'historique des prix
            if product_id and invoice_line.unit_price:
                price_history = PriceHistory(
                    product_id=product_id,
                    supplier_id=supplier.id,
                    invoice_line_id=invoice_line.id,
                    price=invoice_line.total_price,
                    quantity=invoice_line.quantity,
                    unit_price=invoice_line.unit_price,
                    date=invoice.invoice_date
                )
                db.session.add(price_history)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'invoice_id': invoice.id,
            'message': 'Facture sauvegardée avec succès'
        })
    
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Erreur sauvegarde facture: {e}")
        return jsonify({'error': str(e)}), 500

@invoice_bp.route('/invoices', methods=['GET'])
def get_invoices():
    """Récupère la liste des factures"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    invoices = Invoice.query.order_by(Invoice.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    return jsonify({
        'invoices': [invoice.to_dict() for invoice in invoices.items],
        'total': invoices.total,
        'pages': invoices.pages,
        'current_page': page
    })

@invoice_bp.route('/invoices/<int:invoice_id>', methods=['GET'])
def get_invoice(invoice_id):
    """Récupère une facture spécifique"""
    invoice = Invoice.query.get_or_404(invoice_id)
    return jsonify(invoice.to_dict())

@invoice_bp.route('/products', methods=['GET'])
def get_products():
    """Récupère la liste des produits"""
    products = Product.query.all()
    return jsonify([product.to_dict() for product in products])

@invoice_bp.route('/products', methods=['POST'])
def create_product():
    """Crée un nouveau produit"""
    data = request.get_json()
    
    product = Product(
        name=data['name'],
        category=data.get('category', ''),
        unit=data.get('unit', '')
    )
    
    db.session.add(product)
    db.session.commit()
    
    return jsonify(product.to_dict()), 201

@invoice_bp.route('/suppliers', methods=['GET'])
def get_suppliers():
    """Récupère la liste des fournisseurs"""
    suppliers = Supplier.query.all()
    return jsonify([supplier.to_dict() for supplier in suppliers])

