import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

const API_BASE = 'http://localhost:8000/api';

// Inline styles
const styles = {
  gradientBg: {
    background: 'linear-gradient(135deg, #ebf8ff 0%, #dbeafe 100%)',
    minHeight: '100vh'
  },
  gradientBgGreen: {
    background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
    minHeight: '100vh'
  },
  gradientBgYellow: {
    background: 'linear-gradient(135deg, #fefce8 0%, #fed7aa 100%)',
    minHeight: '100vh'
  },
  gradientBgPurple: {
    background: 'linear-gradient(135deg, #fdf4ff 0%, #fce7f3 100%)',
    minHeight: '100vh'
  },
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem'
  },
  card: {
    background: 'white',
    borderRadius: '1rem',
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    padding: '2rem',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    border: '1px solid #f3f4f6'
  },
  cardHover: {
    transform: 'translateY(-8px)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
    gap: '2rem',
    marginBottom: '3rem'
  },
  button: {
    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '0.5rem',
    border: 'none',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '1rem',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
  },
  buttonLarge: {
    background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    color: 'white',
    padding: '1rem 2rem',
    borderRadius: '1rem',
    border: 'none',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '1.25rem',
    transition: 'all 0.2s ease',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
  },
  badge: {
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.875rem',
    fontWeight: '600'
  },
  badgeRed: {
    backgroundColor: '#fee2e2',
    color: '#dc2626'
  },
  badgeGreen: {
    backgroundColor: '#dcfce7',
    color: '#16a34a'
  },
  badgeGray: {
    backgroundColor: '#f3f4f6',
    color: '#374151'
  },
  title: {
    fontSize: '3rem',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: '1rem',
    color: '#1f2937'
  },
  subtitle: {
    fontSize: '1.25rem',
    textAlign: 'center',
    color: '#6b7280',
    marginBottom: '3rem',
    maxWidth: '48rem',
    margin: '0 auto 3rem'
  },
  productIcon: {
    width: '3rem',
    height: '3rem',
    background: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)',
    borderRadius: '0.75rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem'
  },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1.5rem'
  },
  statItem: {
    textAlign: 'center'
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem'
  },
  statLabel: {
    color: '#6b7280',
    fontSize: '0.875rem'
  },
  supplierCard: {
    padding: '1rem',
    borderRadius: '0.75rem',
    border: '2px solid #e5e7eb',
    backgroundColor: '#f9fafb'
  },
  supplierCardBest: {
    border: '2px solid #d1fae5',
    backgroundColor: '#f0fdf4'
  },
  uploadArea: {
    border: '3px dashed #d1d5db',
    borderRadius: '1rem',
    padding: '4rem 2rem',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backgroundColor: '#f9fafb'
  },
  uploadAreaHover: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4'
  },
  spinner: {
    width: '5rem',
    height: '5rem',
    border: '4px solid #fbbf24',
    borderTop: '4px solid #f59e0b',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 2rem'
  },
  progressBar: {
    width: '100%',
    height: '0.75rem',
    backgroundColor: '#e5e7eb',
    borderRadius: '9999px',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)',
    borderRadius: '9999px',
    width: '75%',
    animation: 'pulse 1s ease-in-out infinite alternate'
  }
};

// Add CSS animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  @keyframes pulse {
    0% { opacity: 0.5; }
    100% { opacity: 1; }
  }
`;
document.head.appendChild(styleSheet);

function App() {
  const [currentStep, setCurrentStep] = useState('dashboard');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);

  // Demo data based on your actual invoices
  const demoProducts = [
    {
      id: 1,
      name: "Sable broyé 0/2",
      normalizedName: "SABLE_BROYE_02",
      category: "Matériaux - Granulats",
      unit: "Tonne",
      aliases: ["Sable broyé 0/2 dépôt", "B.L Sable broyé", "Sable 0/2"],
      priceHistory: [
        { date: '2024-01-15', price: 28.50, supplier: 'DENIER ENERGIES', quantity: 1.2 },
        { date: '2024-03-20', price: 28.63, supplier: 'DENIER ENERGIES', quantity: 1.092 },
        { date: '2024-06-12', price: 29.10, supplier: 'CRT', quantity: 0.8 },
        { date: '2024-08-30', price: 30.20, supplier: 'DENIER ENERGIES', quantity: 1.5 },
        { date: '2024-11-30', price: 28.63, supplier: 'DENIER ENERGIES', quantity: 1.092 }
      ],
      volatility: '+2.1%',
      trend: 'stable',
      currentPrice: 28.63
    },
    {
      id: 2,
      name: "Planche coffrage",
      normalizedName: "PLANCHE_COFFRAGE",
      category: "Bois - Construction",
      unit: "ML",
      aliases: ["Planche coffrage 0.20", "Coffrage bois", "Planches 20cm"],
      priceHistory: [
        { date: '2024-02-10', price: 1.95, supplier: 'GLC MATERIAUX', quantity: 24.0 },
        { date: '2024-04-15', price: 2.03, supplier: 'GLC MATERIAUX', quantity: 24.0 },
        { date: '2024-07-22', price: 2.15, supplier: 'GLC MATERIAUX', quantity: 18.5 },
        { date: '2024-10-18', price: 2.25, supplier: 'GLC MATERIAUX', quantity: 32.0 }
      ],
      volatility: '+15.4%',
      trend: 'hausse',
      currentPrice: 2.25
    },
    {
      id: 3,
      name: "Granulés bois",
      normalizedName: "GRANULES_BOIS",
      category: "Énergie - Chauffage",
      unit: "Sac",
      aliases: ["Granulés", "Pellets", "CONSIGNE PALETTE GRANULES"],
      priceHistory: [
        { date: '2024-01-08', price: 2.80, supplier: 'GLC MATERIAUX', quantity: 15.0 },
        { date: '2024-03-15', price: 2.90, supplier: 'GLC MATERIAUX', quantity: 10.0 },
        { date: '2024-06-20', price: 3.10, supplier: 'GLC MATERIAUX', quantity: 12.0 },
        { date: '2024-09-10', price: 3.25, supplier: 'GLC MATERIAUX', quantity: 8.0 }
      ],
      volatility: '+16.1%',
      trend: 'hausse',
      currentPrice: 3.25
    }
  ];

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setUploadedFile(file);
      setCurrentStep('processing');
      simulateOCRProcessing(file);
    }
  };

  const simulateOCRProcessing = (file) => {
    setProcessing(true);
    setTimeout(() => {
      const mockExtractedData = {
        supplier: "NOUVEAU FOURNISSEUR SARL",
        invoiceNumber: "FAC2024-0892",
        date: "2025-01-15",
        total: "245.67",
        rawItems: [
          {
            rawDescription: "Sable fin 0/2 livraison chantier",
            quantity: "2.5",
            unitPrice: "29.50",
            total: "73.75"
          },
          {
            rawDescription: "Planches sapin coffrage 200mm x 25mm",
            quantity: "18.0",
            unitPrice: "2.30",
            total: "41.40"
          }
        ]
      };
      setExtractedData(mockExtractedData);
      setProcessing(false);
      setCurrentStep('matching');
    }, 3000);
  };

  // Main Dashboard View
  const DashboardView = () => (
    <div style={styles.gradientBg}>
      <div style={styles.container}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={styles.title}>
            🏗️ Intelligence Prix & Volatilité
          </h1>
          <p style={styles.subtitle}>
            Transformez vos factures en intelligence stratégique sur l'évolution de vos coûts d'approvisionnement
          </p>
        </div>

        {/* Products Grid */}
        <div style={styles.cardGrid}>
          {demoProducts.map(product => (
            <div 
              key={product.id}
              style={{
                ...styles.card,
                ...(hoveredCard === product.id ? styles.cardHover : {})
              }}
              onClick={() => setSelectedProduct(product)}
              onMouseEnter={() => setHoveredCard(product.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* Product Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div style={styles.productIcon}>
                  <span style={{ color: 'white', fontWeight: 'bold' }}>
                    {product.category.includes('Matériaux') ? '🏗️' : 
                     product.category.includes('Bois') ? '🌳' : '🔥'}
                  </span>
                </div>
                <span style={{
                  ...styles.badge,
                  ...(product.trend === 'hausse' ? styles.badgeRed : 
                      product.trend === 'baisse' ? styles.badgeGreen :
                      styles.badgeGray)
                }}>
                  {product.volatility}
                </span>
              </div>

              {/* Product Info */}
              <h3 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem', color: '#1f2937' }}>
                {product.name}
              </h3>
              <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>{product.category}</p>

              {/* Price Info */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ color: '#6b7280' }}>Prix actuel</span>
                  <span style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>
                    {product.currentPrice.toFixed(2)}€
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ color: '#6b7280' }}>Unité</span>
                  <span style={{ color: '#374151', fontWeight: '500' }}>{product.unit}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#6b7280' }}>Données</span>
                  <span style={{ color: '#374151', fontWeight: '500' }}>
                    {product.priceHistory.length} prix enregistrés
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button style={styles.button}>
                📊 Voir l'analyse détaillée
              </button>
            </div>
          ))}
        </div>

        {/* Upload CTA */}
        <div style={{ textAlign: 'center' }}>
          <button
            style={styles.buttonLarge}
            onClick={() => setCurrentStep('upload')}
          >
            📄 Analyser une nouvelle facture
          </button>
        </div>
      </div>
    </div>
  );

  // Product Detail View
  const ProductDetailView = ({ product }) => (
    <div style={styles.gradientBg}>
      <div style={styles.container}>
        {/* Header with Back Button */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '2rem' }}>
          <button
            style={styles.button}
            onClick={() => setSelectedProduct(null)}
          >
            ← Retour au tableau de bord
          </button>
          <div style={{ marginLeft: '1.5rem' }}>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', margin: 0, color: '#1f2937' }}>{product.name}</h1>
            <p style={{ fontSize: '1.25rem', color: '#6b7280', margin: '0.5rem 0 0 0' }}>{product.category}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          {/* Price Evolution Chart */}
          <div style={styles.card}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1f2937' }}>
              📈 Évolution des Prix
            </h2>
            <div style={{ height: '320px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={product.priceHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{fontSize: 12}} 
                    stroke="#6b7280"
                  />
                  <YAxis 
                    tick={{fontSize: 12}} 
                    stroke="#6b7280"
                    domain={['dataMin - 0.5', 'dataMax + 0.5']}
                  />
                  <Tooltip 
                    formatter={(value) => [`${value}€`, 'Prix unitaire']}
                    labelStyle={{ color: '#374151' }}
                    contentStyle={{ 
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="price" 
                    stroke="#2563eb" 
                    strokeWidth={3} 
                    dot={{fill: '#2563eb', strokeWidth: 2, r: 6}} 
                    activeDot={{r: 8, stroke: '#2563eb', strokeWidth: 2, fill: '#fff'}}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Statistics Panel */}
          <div>
            {/* Key Metrics */}
            <div style={{ ...styles.card, marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1f2937' }}>
                📊 Métriques Clés
              </h2>
              <div style={styles.statGrid}>
                <div style={styles.statItem}>
                  <div style={{ ...styles.statValue, color: '#2563eb' }}>
                    {product.currentPrice.toFixed(2)}€
                  </div>
                  <div style={styles.statLabel}>Prix Actuel</div>
                </div>
                <div style={styles.statItem}>
                  <div style={{ 
                    ...styles.statValue, 
                    color: product.trend === 'hausse' ? '#dc2626' : '#16a34a' 
                  }}>
                    {product.volatility}
                  </div>
                  <div style={styles.statLabel}>Volatilité</div>
                </div>
                <div style={styles.statItem}>
                  <div style={{ ...styles.statValue, color: '#7c3aed' }}>
                    {product.priceHistory.length}
                  </div>
                  <div style={styles.statLabel}>Points de données</div>
                </div>
                <div style={styles.statItem}>
                  <div style={{ ...styles.statValue, color: '#4338ca' }}>
                    {[...new Set(product.priceHistory.map(h => h.supplier))].length}
                  </div>
                  <div style={styles.statLabel}>Fournisseurs</div>
                </div>
              </div>
            </div>

            {/* Supplier Comparison */}
            <div style={styles.card}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1f2937' }}>
                🏢 Comparaison Fournisseurs
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {[...new Set(product.priceHistory.map(h => h.supplier))].map(supplier => {
                  const supplierPrices = product.priceHistory.filter(h => h.supplier === supplier);
                  const avgPrice = supplierPrices.reduce((sum, h) => sum + h.price, 0) / supplierPrices.length;
                  const isLowest = avgPrice === Math.min(...[...new Set(product.priceHistory.map(h => h.supplier))].map(s => {
                    const prices = product.priceHistory.filter(h => h.supplier === s);
                    return prices.reduce((sum, h) => sum + h.price, 0) / prices.length;
                  }));
                  
                  return (
                    <div key={supplier} style={isLowest ? styles.supplierCardBest : styles.supplierCard}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: '600', color: '#1f2937' }}>{supplier}</div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                            {supplierPrices.length} facture(s)
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ 
                            fontSize: '1.25rem', 
                            fontWeight: 'bold',
                            color: isLowest ? '#16a34a' : '#1f2937'
                          }}>
                            {avgPrice.toFixed(2)}€
                          </div>
                          {isLowest && <div style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: '500' }}>
                            Meilleur prix
                          </div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Smart Grouping Section */}
        <div style={styles.card}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1.5rem', color: '#1f2937' }}>
            🧠 Regroupement Intelligent
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
            Notre IA détecte automatiquement les variantes de ce produit dans vos factures :
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
            {product.aliases.map(alias => (
              <span key={alias} style={{
                ...styles.badge,
                backgroundColor: '#dbeafe',
                color: '#1d4ed8'
              }}>
                "{alias}"
              </span>
            ))}
          </div>
          <div style={{
            padding: '1rem',
            backgroundColor: '#dbeafe',
            borderRadius: '0.75rem',
            border: '1px solid #93c5fd'
          }}>
            <p style={{ color: '#1e40af', fontSize: '0.875rem', margin: 0 }}>
              💡 <strong>Avantage :</strong> Même si les fournisseurs utilisent des descriptions différentes, 
              notre système regroupe automatiquement les produits similaires pour une analyse cohérente des prix.
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button
            style={styles.buttonLarge}
            onClick={() => setCurrentStep('upload')}
          >
            📄 Ajouter une nouvelle facture
          </button>
        </div>
      </div>
    </div>
  );

  // Upload View
  const UploadView = () => (
    <div style={styles.gradientBgGreen}>
      <div style={styles.container}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <button
            style={styles.button}
            onClick={() => setCurrentStep('dashboard')}
          >
            ← Retour au tableau de bord
          </button>
          <h1 style={{ ...styles.title, marginTop: '1.5rem' }}>📄 Nouvelle Facture</h1>
          <p style={styles.subtitle}>
            Glissez votre facture pour une analyse automatique intelligente
          </p>
        </div>

        <div style={styles.card}>
          <div 
            style={styles.uploadArea}
            onClick={() => document.getElementById('file-upload').click()}
          >
            <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>📁</div>
            <p style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1f2937', marginBottom: '0.5rem' }}>
              Cliquez ou glissez votre facture ici
            </p>
            <p style={{ fontSize: '1.125rem', color: '#6b7280', marginBottom: '1.5rem' }}>
              PDF, JPG, PNG acceptés
            </p>
            <div style={{
              ...styles.buttonLarge,
              display: 'inline-block',
              margin: 0
            }}>
              Parcourir les fichiers
            </div>
            <input
              id="file-upload"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Processing View
  const ProcessingView = () => (
    <div style={styles.gradientBgYellow}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ ...styles.card, maxWidth: '32rem', textAlign: 'center' }}>
          <div style={styles.spinner}></div>
          <h2 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1.5rem' }}>
            ⚙️ Analyse en cours...
          </h2>
          <div style={{ textAlign: 'left', maxWidth: '20rem', margin: '0 auto 2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '0.75rem', height: '0.75rem', backgroundColor: '#16a34a', borderRadius: '50%' }}></div>
              <span style={{ color: '#374151' }}>Extraction OCR du texte</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ width: '0.75rem', height: '0.75rem', backgroundColor: '#16a34a', borderRadius: '50%' }}></div>
              <span style={{ color: '#374151' }}>Identification des articles</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ 
                width: '0.75rem', 
                height: '0.75rem', 
                backgroundColor: '#f59e0b', 
                borderRadius: '50%',
                animation: 'pulse 1s ease-in-out infinite alternate'
              }}></div>
              <span style={{ color: '#374151' }}>Regroupement intelligent...</span>
            </div>
          </div>
          <div style={styles.progressBar}>
            <div style={styles.progressFill}></div>
          </div>
        </div>
      </div>
    </div>
  );

  // Smart Matching View
  const MatchingView = () => (
    <div style={styles.gradientBgPurple}>
      <div style={styles.container}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={styles.title}>🎯 Reconnaissance Intelligente</h1>
          <p style={styles.subtitle}>
            Notre IA a automatiquement identifié et regroupé les articles de votre facture
          </p>
        </div>

        {extractedData && (
          <div>
            {/* Invoice Info */}
            <div style={{ ...styles.card, marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#1f2937' }}>
                📋 Facture analysée
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
                <div>
                  <div style={{ color: '#6b7280', marginBottom: '0.25rem' }}>Fournisseur</div>
                  <div style={{ fontWeight: '600', fontSize: '1.125rem' }}>{extractedData.supplier}</div>
                </div>
                <div>
                  <div style={{ color: '#6b7280', marginBottom: '0.25rem' }}>N° Facture</div>
                  <div style={{ fontWeight: '600', fontSize: '1.125rem' }}>{extractedData.invoiceNumber}</div>
                </div>
                <div>
                  <div style={{ color: '#6b7280', marginBottom: '0.25rem' }}>Date</div>
                  <div style={{ fontWeight: '600', fontSize: '1.125rem' }}>{extractedData.date}</div>
                </div>
              </div>
            </div>

            {/* Matching Results */}
            <div style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1f2937', marginBottom: '1.5rem' }}>
                ✨ Résultats du regroupement automatique
              </h2>
              
              {extractedData.rawItems.map((item, idx) => (
                <div key={idx} style={{ ...styles.card, marginBottom: '1.5rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                    {/* Original OCR */}
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#374151', marginBottom: '1rem' }}>
                        📝 Texte original (OCR)
                      </h3>
                      <div style={{
                        backgroundColor: '#f3f4f6',
                        padding: '1.5rem',
                        borderRadius: '0.75rem'
                      }}>
                        <p style={{ color: '#374151', fontStyle: 'italic', fontSize: '1.125rem', marginBottom: '1rem' }}>
                          "{item.rawDescription}"
                        </p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                          <span style={{
                            backgroundColor: '#d1d5db',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '0.5rem',
                            fontWeight: '500'
                          }}>
                            {item.quantity} unités
                          </span>
                          <span style={{
                            backgroundColor: '#d1d5db',
                            padding: '0.5rem 0.75rem',
                            borderRadius: '0.5rem',
                            fontWeight: '500'
                          }}>
                            {item.unitPrice}€/unité
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {/* AI Match */}
                    <div>
                      <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#059669', marginBottom: '1rem' }}>
                        ✅ Identifié automatiquement comme
                      </h3>
                      <div style={{
                        backgroundColor: '#f0fdf4',
                        padding: '1.5rem',
                        borderRadius: '0.75rem',
                        border: '2px solid #bbf7d0'
                      }}>
                        <p style={{ color: '#059669', fontWeight: 'bold', fontSize: '1.25rem', marginBottom: '1rem' }}>
                          {idx === 0 ? "Sable broyé 0/2" : "Planche coffrage"}
                        </p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#047857' }}>Correspondance :</span>
                            <span style={{
                              backgroundColor: '#bbf7d0',
                              color: '#059669',
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontWeight: 'bold'
                            }}>
                              {idx === 0 ? "94%" : "87%"}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#047857' }}>Prix actuel base :</span>
                            <span style={{ fontWeight: '600' }}>
                              {idx === 0 ? "28.63€/T" : "2.25€/ML"}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#047857' }}>Nouveau prix :</span>
                            <span style={{ fontWeight: 'bold', fontSize: '1.125rem', color: '#059669' }}>
                              {item.unitPrice}€
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem' }}>
              <button
                style={styles.buttonLarge}
                onClick={() => {
                  setCurrentStep('dashboard');
                  alert('✅ Facture intégrée avec succès ! Les nouveaux prix ont été ajoutés à votre base de données.');
                }}
              >
                ✅ Valider et intégrer les données
              </button>
              <button
                style={{
                  backgroundColor: '#d1d5db',
                  color: '#374151',
                  padding: '1rem 2rem',
                  borderRadius: '1rem',
                  border: 'none',
                  fontWeight: '600',
                  cursor: 'pointer',
                  fontSize: '1.25rem'
                }}
                onClick={() => setCurrentStep('upload')}
              >
                ← Analyser une autre facture
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Main Render Logic
  if (selectedProduct && currentStep === 'dashboard') {
    return <ProductDetailView product={selectedProduct} />;
  }

  switch (currentStep) {
    case 'upload':
      return <UploadView />;
    case 'processing':
      return <ProcessingView />;
    case 'matching':
      return <MatchingView />;
    default:
      return <DashboardView />;
  }
}

export default App;