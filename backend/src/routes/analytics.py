from flask import Blueprint, request, jsonify
from sqlalchemy import func, desc, asc
from datetime import datetime, timedelta
import statistics
from collections import defaultdict

from src.models.user import db
from src.models.invoice import Product, Supplier, PriceHistory, Invoice, InvoiceLine


analytics_bp = Blueprint('analytics', __name__)

@analytics_bp.route('/price-evolution/<int:product_id>', methods=['GET'])
def get_price_evolution(product_id):
    """Récupère l'évolution des prix pour un produit donné"""
    granularity = request.args.get('granularity', 'monthly')  # monthly, quarterly, yearly
    supplier_id = request.args.get('supplier_id', type=int)
    
    # Base query
    query = db.session.query(PriceHistory).filter(PriceHistory.product_id == product_id)
    
    if supplier_id:
        query = query.filter(PriceHistory.supplier_id == supplier_id)
    
    price_data = query.order_by(PriceHistory.date.asc()).all()
    
    if not price_data:
        return jsonify({'error': 'Aucune donnée de prix trouvée'}), 404
    
    # Grouper les données selon la granularité
    grouped_data = defaultdict(list)
    
    for price in price_data:
        if granularity == 'monthly':
            key = price.date.strftime('%Y-%m')
        elif granularity == 'quarterly':
            quarter = (price.date.month - 1) // 3 + 1
            key = f"{price.date.year}-Q{quarter}"
        else:  # yearly
            key = str(price.date.year)
        
        grouped_data[key].append({
            'date': price.date.isoformat(),
            'unit_price': price.unit_price,
            'supplier_id': price.supplier_id,
            'supplier_name': price.supplier.name if price.supplier else 'Inconnu'
        })
    
    # Calculer les moyennes par période
    evolution_data = []
    for period, prices in sorted(grouped_data.items()):
        avg_price = statistics.mean([p['unit_price'] for p in prices])
        min_price = min([p['unit_price'] for p in prices])
        max_price = max([p['unit_price'] for p in prices])
        
        evolution_data.append({
            'period': period,
            'average_price': round(avg_price, 2),
            'min_price': round(min_price, 2),
            'max_price': round(max_price, 2),
            'data_points': len(prices),
            'suppliers': list(set([p['supplier_name'] for p in prices]))
        })
    
    # Calculer les variations
    for i in range(1, len(evolution_data)):
        prev_price = evolution_data[i-1]['average_price']
        curr_price = evolution_data[i]['average_price']
        variation = ((curr_price - prev_price) / prev_price) * 100 if prev_price > 0 else 0
        evolution_data[i]['variation_percent'] = round(variation, 2)
        evolution_data[i]['is_significant'] = abs(variation) > 15  # Seuil de variation significative
    
    product = Product.query.get(product_id)
    
    return jsonify({
        'product': product.to_dict() if product else None,
        'granularity': granularity,
        'evolution': evolution_data,
        'total_data_points': len(price_data)
    })

@analytics_bp.route('/price-volatility', methods=['GET'])
def get_price_volatility():
    """Analyse de volatilité des prix par produit"""
    limit = request.args.get('limit', 20, type=int)
    
    # Récupérer tous les produits avec leurs prix
    products_volatility = []
    
    products = Product.query.all()
    
    for product in products:
        prices = [ph.unit_price for ph in product.price_history if ph.unit_price > 0]
        
        if len(prices) < 2:
            continue
        
        # Calculs statistiques
        mean_price = statistics.mean(prices)
        std_dev = statistics.stdev(prices) if len(prices) > 1 else 0
        coefficient_variation = (std_dev / mean_price) * 100 if mean_price > 0 else 0
        min_price = min(prices)
        max_price = max(prices)
        price_range = max_price - min_price
        
        # Nombre de fournisseurs différents
        suppliers_count = len(set([ph.supplier_id for ph in product.price_history]))
        
        # Dernière mise à jour
        last_price_date = max([ph.date for ph in product.price_history])
        
        products_volatility.append({
            'product': product.to_dict(),
            'statistics': {
                'mean_price': round(mean_price, 2),
                'std_deviation': round(std_dev, 2),
                'coefficient_variation': round(coefficient_variation, 2),
                'min_price': round(min_price, 2),
                'max_price': round(max_price, 2),
                'price_range': round(price_range, 2),
                'data_points': len(prices),
                'suppliers_count': suppliers_count,
                'last_update': last_price_date.isoformat()
            },
            'volatility_level': 'high' if coefficient_variation > 20 else 'medium' if coefficient_variation > 10 else 'low'
        })
    
    # Trier par coefficient de variation (plus volatil en premier)
    products_volatility.sort(key=lambda x: x['statistics']['coefficient_variation'], reverse=True)
    
    return jsonify({
        'products': products_volatility[:limit],
        'total_products': len(products_volatility)
    })

@analytics_bp.route('/supplier-comparison/<int:product_id>', methods=['GET'])
def get_supplier_comparison(product_id):
    """Compare les prix d'un produit entre différents fournisseurs"""
    
    # Récupérer les données de prix par fournisseur
    suppliers_data = db.session.query(
        Supplier.id,
        Supplier.name,
        func.avg(PriceHistory.unit_price).label('avg_price'),
        func.min(PriceHistory.unit_price).label('min_price'),
        func.max(PriceHistory.unit_price).label('max_price'),
        func.count(PriceHistory.id).label('data_points'),
        func.max(PriceHistory.date).label('last_update')
    ).join(PriceHistory).filter(
        PriceHistory.product_id == product_id
    ).group_by(Supplier.id, Supplier.name).all()
    
    if not suppliers_data:
        return jsonify({'error': 'Aucune donnée trouvée pour ce produit'}), 404
    
    comparison_data = []
    for supplier in suppliers_data:
        # Calculer l'évolution récente (3 derniers mois)
        recent_prices = db.session.query(PriceHistory.unit_price).filter(
            PriceHistory.product_id == product_id,
            PriceHistory.supplier_id == supplier.id,
            PriceHistory.date >= datetime.now().date() - timedelta(days=90)
        ).order_by(PriceHistory.date.desc()).limit(5).all()
        
        recent_trend = 'stable'
        if len(recent_prices) >= 2:
            first_price = recent_prices[-1][0]
            last_price = recent_prices[0][0]
            variation = ((last_price - first_price) / first_price) * 100 if first_price > 0 else 0
            
            if variation > 5:
                recent_trend = 'increasing'
            elif variation < -5:
                recent_trend = 'decreasing'
        
        comparison_data.append({
            'supplier': {
                'id': supplier.id,
                'name': supplier.name
            },
            'pricing': {
                'average_price': round(float(supplier.avg_price), 2),
                'min_price': round(float(supplier.min_price), 2),
                'max_price': round(float(supplier.max_price), 2),
                'data_points': supplier.data_points,
                'last_update': supplier.last_update.isoformat()
            },
            'recent_trend': recent_trend
        })
    
    # Trier par prix moyen
    comparison_data.sort(key=lambda x: x['pricing']['average_price'])
    
    # Identifier le meilleur fournisseur (prix le plus bas)
    if comparison_data:
        comparison_data[0]['is_best_price'] = True
    
    product = Product.query.get(product_id)
    
    return jsonify({
        'product': product.to_dict() if product else None,
        'suppliers_comparison': comparison_data,
        'total_suppliers': len(comparison_data)
    })

@analytics_bp.route('/dashboard-kpis', methods=['GET'])
def get_dashboard_kpis():
    """Récupère les KPIs pour le dashboard principal"""
    
    # Nombre total de factures
    total_invoices = Invoice.query.count()
    
    # Nombre de produits uniques
    total_products = Product.query.count()
    
    # Nombre de fournisseurs
    total_suppliers = Supplier.query.count()
    
    # Factures du mois en cours
    current_month = datetime.now().replace(day=1)
    monthly_invoices = Invoice.query.filter(Invoice.created_at >= current_month).count()
    
    # Top 5 des produits les plus volatils
    volatile_products = []
    products = Product.query.limit(50).all()  # Limiter pour les performances
    
    for product in products:
        prices = [ph.unit_price for ph in product.price_history if ph.unit_price > 0]
        if len(prices) >= 2:
            mean_price = statistics.mean(prices)
            std_dev = statistics.stdev(prices)
            cv = (std_dev / mean_price) * 100 if mean_price > 0 else 0
            
            volatile_products.append({
                'product': product.to_dict(),
                'coefficient_variation': round(cv, 2)
            })
    
    volatile_products.sort(key=lambda x: x['coefficient_variation'], reverse=True)
    top_volatile = volatile_products[:5]
    
    # Évolution globale des prix (moyenne tous produits)
    recent_prices = db.session.query(
        func.date_trunc('month', PriceHistory.date).label('month'),
        func.avg(PriceHistory.unit_price).label('avg_price')
    ).filter(
        PriceHistory.date >= datetime.now().date() - timedelta(days=365)
    ).group_by(
        func.date_trunc('month', PriceHistory.date)
    ).order_by('month').all()
    
    price_trend = []
    for month_data in recent_prices:
        price_trend.append({
            'month': month_data.month.strftime('%Y-%m'),
            'average_price': round(float(month_data.avg_price), 2)
        })
    
    # Calcul de la variation globale
    global_variation = 0
    if len(price_trend) >= 2:
        first_avg = price_trend[0]['average_price']
        last_avg = price_trend[-1]['average_price']
        global_variation = ((last_avg - first_avg) / first_avg) * 100 if first_avg > 0 else 0
    
    return jsonify({
        'kpis': {
            'total_invoices': total_invoices,
            'total_products': total_products,
            'total_suppliers': total_suppliers,
            'monthly_invoices': monthly_invoices,
            'global_price_variation': round(global_variation, 2)
        },
        'top_volatile_products': top_volatile,
        'price_trend': price_trend
    })

@analytics_bp.route('/price-alerts', methods=['GET'])
def get_price_alerts():
    """Détecte les alertes de variation de prix significatives"""
    threshold = request.args.get('threshold', 15, type=float)  # Seuil en pourcentage
    days_back = request.args.get('days', 30, type=int)  # Période d'analyse
    
    alerts = []
    cutoff_date = datetime.now().date() - timedelta(days=days_back)
    
    # Récupérer les produits avec des prix récents
    products_with_recent_prices = db.session.query(Product.id).join(PriceHistory).filter(
        PriceHistory.date >= cutoff_date
    ).distinct().all()
    
    for (product_id,) in products_with_recent_prices:
        # Récupérer les 2 derniers prix pour ce produit
        recent_prices = db.session.query(PriceHistory).filter(
            PriceHistory.product_id == product_id,
            PriceHistory.date >= cutoff_date
        ).order_by(PriceHistory.date.desc()).limit(2).all()
        
        if len(recent_prices) >= 2:
            latest_price = recent_prices[0]
            previous_price = recent_prices[1]
            
            variation = ((latest_price.unit_price - previous_price.unit_price) / previous_price.unit_price) * 100
            
            if abs(variation) >= threshold:
                product = Product.query.get(product_id)
                alerts.append({
                    'product': product.to_dict(),
                    'supplier': latest_price.supplier.to_dict(),
                    'previous_price': round(previous_price.unit_price, 2),
                    'current_price': round(latest_price.unit_price, 2),
                    'variation_percent': round(variation, 2),
                    'alert_type': 'increase' if variation > 0 else 'decrease',
                    'severity': 'high' if abs(variation) > 25 else 'medium',
                    'date': latest_price.date.isoformat()
                })
    
    # Trier par variation absolue décroissante
    alerts.sort(key=lambda x: abs(x['variation_percent']), reverse=True)
    
    return jsonify({
        'alerts': alerts,
        'threshold': threshold,
        'period_days': days_back,
        'total_alerts': len(alerts)
    })

