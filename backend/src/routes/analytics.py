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
            'supplier_name': price.supplier.name if price.supplier else 'Inconnu',
            'quantity': price.quantity
        })
    
    # Calculer les moyennes par période
    evolution_data = []
    for period, prices in sorted(grouped_data.items()):
        avg_price = statistics.mean([p['unit_price'] for p in prices])
        min_price = min([p['unit_price'] for p in prices])
        max_price = max([p['unit_price'] for p in prices])
        total_quantity = sum([p['quantity'] for p in prices])
        
        evolution_data.append({
            'period': period,
            'average_price': round(avg_price, 2),
            'min_price': round(min_price, 2),
            'max_price': round(max_price, 2),
            'total_quantity': round(total_quantity, 2),
            'transactions_count': len(prices),
            'suppliers': list(set([p['supplier_name'] for p in prices]))
        })
    
    # Calculer la volatilité
    if len(evolution_data) > 1:
        first_price = evolution_data[0]['average_price']
        last_price = evolution_data[-1]['average_price']
        volatility = round(((last_price - first_price) / first_price) * 100, 1)
    else:
        volatility = 0
    
    # Obtenir les infos du produit
    product = Product.query.get(product_id)
    
    return jsonify({
        'product': {
            'id': product.id,
            'name': product.name,
            'category': product.category,
            'unit': product.unit
        },
        'evolution': evolution_data,
        'volatility_percentage': volatility,
        'total_data_points': len(price_data),
        'date_range': {
            'start': price_data[0].date.isoformat(),
            'end': price_data[-1].date.isoformat()
        }
    })

@analytics_bp.route('/products-summary', methods=['GET'])
def get_products_summary():
    """Récupère un résumé de tous les produits avec leurs données de prix"""
    products = db.session.query(Product).all()
    
    products_summary = []
    for product in products:
        # Obtenir les données de prix pour ce produit
        price_history = db.session.query(PriceHistory)\
            .filter(PriceHistory.product_id == product.id)\
            .order_by(PriceHistory.date.asc()).all()
        
        if price_history:
            prices = [p.unit_price for p in price_history]
            latest_price = price_history[-1].unit_price
            first_price = price_history[0].unit_price
            
            # Calculer la volatilité
            volatility = ((latest_price - first_price) / first_price) * 100 if first_price > 0 else 0
            
            # Déterminer la tendance
            if len(price_history) >= 2:
                recent_prices = prices[-3:] if len(prices) >= 3 else prices
                if len(recent_prices) >= 2:
                    trend_slope = (recent_prices[-1] - recent_prices[0]) / len(recent_prices)
                    if trend_slope > 0.1:
                        trend = 'hausse'
                    elif trend_slope < -0.1:
                        trend = 'baisse'
                    else:
                        trend = 'stable'
                else:
                    trend = 'stable'
            else:
                trend = 'stable'
            
            # Obtenir les fournisseurs uniques
            suppliers = list(set([p.supplier.name for p in price_history if p.supplier]))
            
            products_summary.append({
                'id': product.id,
                'name': product.name,
                'category': product.category,
                'unit': product.unit,
                'latest_price': round(latest_price, 2),
                'volatility_percentage': round(volatility, 1),
                'trend': trend,
                'price_data_points': len(price_history),
                'suppliers': suppliers,
                'price_range': {
                    'min': round(min(prices), 2),
                    'max': round(max(prices), 2)
                }
            })
    
    return jsonify(products_summary)

@analytics_bp.route('/supplier-comparison/<int:product_id>', methods=['GET'])
def get_supplier_comparison(product_id):
    """Compare les prix d'un produit entre différents fournisseurs"""
    price_data = db.session.query(PriceHistory)\
        .filter(PriceHistory.product_id == product_id)\
        .join(Supplier)\
        .all()
    
    if not price_data:
        return jsonify({'error': 'Aucune donnée trouvée'}), 404
    
    # Grouper par fournisseur
    supplier_data = defaultdict(list)
    for price in price_data:
        supplier_data[price.supplier.name].append(price)
    
    comparison = []
    for supplier_name, prices in supplier_data.items():
        unit_prices = [p.unit_price for p in prices]
        quantities = [p.quantity for p in prices]
        
        comparison.append({
            'supplier_name': supplier_name,
            'average_price': round(statistics.mean(unit_prices), 2),
            'min_price': round(min(unit_prices), 2),
            'max_price': round(max(unit_prices), 2),
            'total_orders': len(prices),
            'total_quantity': round(sum(quantities), 2),
            'last_order_date': max([p.date for p in prices]).isoformat(),
            'price_stability': round(statistics.stdev(unit_prices) if len(unit_prices) > 1 else 0, 2)
        })
    
    # Trier par prix moyen
    comparison.sort(key=lambda x: x['average_price'])
    
    return jsonify({
        'product_id': product_id,
        'suppliers_comparison': comparison
    })

@analytics_bp.route('/volatility-report', methods=['GET'])
def get_volatility_report():
    """Génère un rapport de volatilité pour tous les produits"""
    days = request.args.get('days', 90, type=int)  # Par défaut 90 jours
    
    cutoff_date = datetime.now().date() - timedelta(days=days)
    
    # Obtenir tous les produits avec des données de prix récentes
    products_with_recent_prices = db.session.query(Product)\
        .join(PriceHistory)\
        .filter(PriceHistory.date >= cutoff_date)\
        .distinct().all()
    
    volatility_report = []
    
    for product in products_with_recent_prices:
        recent_prices = db.session.query(PriceHistory)\
            .filter(PriceHistory.product_id == product.id)\
            .filter(PriceHistory.date >= cutoff_date)\
            .order_by(PriceHistory.date.asc()).all()
        
        if len(recent_prices) >= 2:
            prices = [p.unit_price for p in recent_prices]
            
            # Calculer différentes métriques de volatilité
            price_changes = []
            for i in range(1, len(prices)):
                change = ((prices[i] - prices[i-1]) / prices[i-1]) * 100
                price_changes.append(change)
            
            volatility_report.append({
                'product_id': product.id,
                'product_name': product.name,
                'category': product.category,
                'unit': product.unit,
                'period_start': recent_prices[0].date.isoformat(),
                'period_end': recent_prices[-1].date.isoformat(),
                'price_start': round(recent_prices[0].unit_price, 2),
                'price_end': round(recent_prices[-1].unit_price, 2),
                'total_change_percent': round(((recent_prices[-1].unit_price - recent_prices[0].unit_price) / recent_prices[0].unit_price) * 100, 2),
                'volatility_score': round(statistics.stdev(price_changes) if price_changes else 0, 2),
                'max_increase': round(max(price_changes) if price_changes else 0, 2),
                'max_decrease': round(min(price_changes) if price_changes else 0, 2),
                'data_points': len(recent_prices)
            })
    
    # Trier par score de volatilité décroissant
    volatility_report.sort(key=lambda x: x['volatility_score'], reverse=True)
    
    return jsonify({
        'report_period_days': days,
        'generated_at': datetime.now().isoformat(),
        'products_analyzed': len(volatility_report),
        'volatility_data': volatility_report
    })