from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, date
from src.models.user import db

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    category = db.Column(db.String(100), nullable=True)
    unit = db.Column(db.String(50), nullable=True)  # kg, pièce, litre, etc.
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    invoice_lines = db.relationship('InvoiceLine', backref='product', lazy=True)
    
    def __repr__(self):
        return f'<Product {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'unit': self.unit,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Supplier(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    address = db.Column(db.Text, nullable=True)
    contact_info = db.Column(db.String(200), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    invoices = db.relationship('Invoice', backref='supplier', lazy=True)
    
    def __repr__(self):
        return f'<Supplier {self.name}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'address': self.address,
            'contact_info': self.contact_info,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Invoice(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    invoice_number = db.Column(db.String(100), nullable=False)
    invoice_date = db.Column(db.Date, nullable=False)
    supplier_id = db.Column(db.Integer, db.ForeignKey('supplier.id'), nullable=False)
    total_amount = db.Column(db.Float, nullable=True)
    currency = db.Column(db.String(10), default='EUR')
    status = db.Column(db.String(50), default='pending')  # pending, validated, processed
    ocr_confidence = db.Column(db.Float, nullable=True)  # Score de confiance global OCR
    file_path = db.Column(db.String(500), nullable=True)  # Chemin vers le fichier original
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    invoice_lines = db.relationship('InvoiceLine', backref='invoice', lazy=True, cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Invoice {self.invoice_number}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'invoice_number': self.invoice_number,
            'invoice_date': self.invoice_date.isoformat() if self.invoice_date else None,
            'supplier_id': self.supplier_id,
            'supplier': self.supplier.to_dict() if self.supplier else None,
            'total_amount': self.total_amount,
            'currency': self.currency,
            'status': self.status,
            'ocr_confidence': self.ocr_confidence,
            'file_path': self.file_path,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'invoice_lines': [line.to_dict() for line in self.invoice_lines]
        }

class InvoiceLine(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    invoice_id = db.Column(db.Integer, db.ForeignKey('invoice.id'), nullable=False)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=True)
    
    # Données extraites par OCR
    raw_description = db.Column(db.Text, nullable=False)  # Description brute extraite
    quantity = db.Column(db.Float, nullable=True)
    unit_price = db.Column(db.Float, nullable=True)
    total_price = db.Column(db.Float, nullable=True)
    
    # Métadonnées de validation
    validation_status = db.Column(db.String(50), default='pending')  # pending, validated, rejected
    validated_by = db.Column(db.String(100), nullable=True)
    validated_at = db.Column(db.DateTime, nullable=True)
    ocr_confidence = db.Column(db.Float, nullable=True)  # Score de confiance de cette ligne
    
    # Correspondance produit
    product_match_confidence = db.Column(db.Float, nullable=True)  # Score de correspondance avec produit existant
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<InvoiceLine {self.raw_description[:50]}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'invoice_id': self.invoice_id,
            'product_id': self.product_id,
            'product': self.product.to_dict() if self.product else None,
            'raw_description': self.raw_description,
            'quantity': self.quantity,
            'unit_price': self.unit_price,
            'total_price': self.total_price,
            'validation_status': self.validation_status,
            'validated_by': self.validated_by,
            'validated_at': self.validated_at.isoformat() if self.validated_at else None,
            'ocr_confidence': self.ocr_confidence,
            'product_match_confidence': self.product_match_confidence,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class PriceHistory(db.Model):
    """Historique des prix pour analyse de volatilité"""
    id = db.Column(db.Integer, primary_key=True)
    product_id = db.Column(db.Integer, db.ForeignKey('product.id'), nullable=False)
    supplier_id = db.Column(db.Integer, db.ForeignKey('supplier.id'), nullable=False)
    invoice_line_id = db.Column(db.Integer, db.ForeignKey('invoice_line.id'), nullable=False)
    
    price = db.Column(db.Float, nullable=False)
    quantity = db.Column(db.Float, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)
    date = db.Column(db.Date, nullable=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relations
    product = db.relationship('Product', backref='price_history')
    supplier = db.relationship('Supplier', backref='price_history')
    invoice_line = db.relationship('InvoiceLine', backref='price_history')
    
    def __repr__(self):
        return f'<PriceHistory {self.product.name if self.product else "Unknown"} - {self.unit_price}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'product_id': self.product_id,
            'supplier_id': self.supplier_id,
            'invoice_line_id': self.invoice_line_id,
            'price': self.price,
            'quantity': self.quantity,
            'unit_price': self.unit_price,
            'date': self.date.isoformat() if self.date else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'product': self.product.to_dict() if self.product else None,
            'supplier': self.supplier.to_dict() if self.supplier else None
        }