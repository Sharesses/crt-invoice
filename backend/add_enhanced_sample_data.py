#!/usr/bin/env python3
"""
Enhanced sample data script for analytics demo
Run this from the backend directory: python3 add_enhanced_sample_data.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from datetime import datetime, date
from src.main import app
from src.models.user import db
from src.models.invoice import Product, Supplier, Invoice, InvoiceLine, PriceHistory

def add_enhanced_sample_data():
    with app.app_context():
        # Clear existing data
        db.drop_all()
        db.create_all()
        
        print("Adding enhanced sample data for analytics demo...")
        
        # Add suppliers
        suppliers = [
            Supplier(name="DENIER ENERGIES", address="400 ZA les Chalus 04300 FORCALQUIER", contact_info="04 92 75 02 51"),
            Supplier(name="GLC MATERIAUX", address="Le grand briant quartier beaudine 04300 FORCALQUIER", contact_info="06.87.63.29.43"),
            Supplier(name="CRT", address="ZA LES CHALUS 04300 FORCALQUIER", contact_info="04 92 73 03 21"),
            Supplier(name="NOUVEAU FOURNISSEUR SARL", address="Zone Artisanale 04000 DIGNE", contact_info="04 92 XX XX XX")
        ]
        
        for supplier in suppliers:
            db.session.add(supplier)
        db.session.flush()
        
        # Add normalized products with multiple aliases
        products = [
            Product(name="Sable broyé 0/2", category="Matériaux - Granulats", unit="Tonne"),
            Product(name="Planche coffrage", category="Bois - Construction", unit="ML"),
            Product(name="Granulés bois", category="Énergie - Chauffage", unit="Sac"),
            Product(name="Gravier 10/20", category="Matériaux - Granulats", unit="Tonne"),
            Product(name="Béton mélange", category="Matériaux - Béton", unit="Tonne"),
        ]
        
        for product in products:
            db.session.add(product)
        db.session.flush()
        
        # Create price history data for analytics
        price_data = [
            # Sable broyé 0/2 - Product ID 1
            {
                "product_id": 1,
                "data": [
                    (date(2024, 1, 15), 28.50, suppliers[0].id, 1.2),
                    (date(2024, 3, 20), 28.63, suppliers[0].id, 1.092),
                    (date(2024, 6, 12), 29.10, suppliers[2].id, 0.8),
                    (date(2024, 8, 30), 30.20, suppliers[0].id, 1.5),
                    (date(2024, 11, 30), 28.63, suppliers[0].id, 1.092)
                ]
            },
            # Planche coffrage - Product ID 2
            {
                "product_id": 2,
                "data": [
                    (date(2024, 2, 10), 1.95, suppliers[1].id, 24.0),
                    (date(2024, 4, 15), 2.03, suppliers[1].id, 24.0),
                    (date(2024, 7, 22), 2.15, suppliers[1].id, 18.5),
                    (date(2024, 10, 18), 2.25, suppliers[1].id, 32.0)
                ]
            },
            # Granulés bois - Product ID 3
            {
                "product_id": 3,
                "data": [
                    (date(2024, 1, 8), 2.80, suppliers[1].id, 15.0),
                    (date(2024, 3, 15), 2.90, suppliers[1].id, 10.0),
                    (date(2024, 6, 20), 3.10, suppliers[1].id, 12.0),
                    (date(2024, 9, 10), 3.25, suppliers[1].id, 8.0)
                ]
            }
        ]
        
        # Create invoices and price history
        invoice_counter = 1
        for product_data in price_data:
            product = products[product_data["product_id"] - 1]
            
            for inv_date, unit_price, supplier_id, quantity in product_data["data"]:
                # Create invoice
                invoice = Invoice(
                    invoice_number=f"FAC-{invoice_counter:04d}",
                    invoice_date=inv_date,
                    supplier_id=supplier_id,
                    total_amount=unit_price * quantity,
                    currency="EUR",
                    status="validated",
                    ocr_confidence=0.85
                )
                db.session.add(invoice)
                db.session.flush()
                
                # Create invoice line
                line = InvoiceLine(
                    invoice_id=invoice.id,
                    product_id=product.id,
                    raw_description=f"{product.name} - Various descriptions",
                    quantity=quantity,
                    unit_price=unit_price,
                    total_price=unit_price * quantity,
                    validation_status="validated",
                    validated_by="demo",
                    validated_at=datetime.utcnow(),
                    ocr_confidence=0.9
                )
                db.session.add(line)
                db.session.flush()
                
                # Create price history
                price_history = PriceHistory(
                    product_id=product.id,
                    supplier_id=supplier_id,
                    invoice_line_id=line.id,
                    price=unit_price * quantity,
                    quantity=quantity,
                    unit_price=unit_price,
                    date=inv_date
                )
                db.session.add(price_history)
                
                invoice_counter += 1
        
        db.session.commit()
        print("✅ Enhanced sample data added successfully!")
        print(f"Added {len(suppliers)} suppliers")
        print(f"Added {len(products)} products") 
        print(f"Added {invoice_counter-1} invoices with price history")
        
        # Test the API endpoints
        print("\n🔗 Test these analytics URLs:")
        print("http://localhost:8000/api/analytics/price-evolution/1")  # Sable broyé
        print("http://localhost:8000/api/analytics/price-evolution/2")  # Planche coffrage
        print("http://localhost:8000/api/analytics/price-evolution/3")  # Granulés
        print("http://localhost:8000/api/invoices")
        print("http://localhost:8000/api/products")

if __name__ == "__main__":
    add_enhanced_sample_data()