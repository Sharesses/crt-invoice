import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, ScatterChart, Scatter, Cell } from 'recharts'
import { TrendingUp, TrendingDown, AlertTriangle, Calendar, Filter } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const PriceCharts = ({ productId, supplierFilter }) => {
  const [priceEvolution, setPriceEvolution] = useState([])
  const [volatilityData, setVolatilityData] = useState([])
  const [supplierComparison, setSupplierComparison] = useState([])
  const [granularity, setGranularity] = useState('monthly')
  const [selectedProduct, setSelectedProduct] = useState(productId || null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadProducts()
  }, [])

  useEffect(() => {
    if (selectedProduct) {
      loadPriceEvolution()
      loadSupplierComparison()
    }
  }, [selectedProduct, granularity])

  useEffect(() => {
    loadVolatilityData()
  }, [])

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/invoices/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
        if (!selectedProduct && data.length > 0) {
          setSelectedProduct(data[0].id)
        }
      }
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error)
    }
  }

  const loadPriceEvolution = async () => {
    if (!selectedProduct) return
    
    setLoading(true)
    try {
      const url = `/api/analytics/price-evolution/${selectedProduct}?granularity=${granularity}${supplierFilter ? `&supplier_id=${supplierFilter}` : ''}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setPriceEvolution(data.evolution || [])
      }
    } catch (error) {
      console.error('Erreur lors du chargement de l\'évolution des prix:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadVolatilityData = async () => {
    try {
      const response = await fetch('/api/analytics/price-volatility?limit=10')
      if (response.ok) {
        const data = await response.json()
        setVolatilityData(data.products || [])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données de volatilité:', error)
    }
  }

  const loadSupplierComparison = async () => {
    if (!selectedProduct) return
    
    try {
      const response = await fetch(`/api/analytics/supplier-comparison/${selectedProduct}`)
      if (response.ok) {
        const data = await response.json()
        setSupplierComparison(data.suppliers_comparison || [])
      }
    } catch (error) {
      console.error('Erreur lors du chargement de la comparaison fournisseurs:', error)
    }
  }

  const getVariationColor = (variation) => {
    if (variation > 15) return '#ef4444' // Rouge pour forte hausse
    if (variation > 5) return '#f97316' // Orange pour hausse modérée
    if (variation < -15) return '#22c55e' // Vert pour forte baisse
    if (variation < -5) return '#84cc16' // Vert clair pour baisse modérée
    return '#6b7280' // Gris pour stable
  }

  const getVolatilityColor = (level) => {
    switch (level) {
      case 'high': return '#ef4444'
      case 'medium': return '#f97316'
      case 'low': return '#22c55e'
      default: return '#6b7280'
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(value)
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-medium">{`Période: ${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.dataKey}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const selectedProductData = products.find(p => p.id === selectedProduct)

  return (
    <div className="space-y-6">
      {/* Sélecteur de produit */}
      <Card>
        <CardHeader>
          <CardTitle>Sélection du produit à analyser</CardTitle>
          <CardDescription>
            Choisissez un produit pour visualiser son évolution de prix et sa volatilité
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">Produit</label>
              <Select value={selectedProduct?.toString() || ''} onValueChange={(value) => setSelectedProduct(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un produit" />
                </SelectTrigger>
                <SelectContent>
                  {products.map(product => (
                    <SelectItem key={product.id} value={product.id.toString()}>
                      {product.name} {product.category && `(${product.category})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Granularité</label>
              <Select value={granularity} onValueChange={setGranularity}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensuel</SelectItem>
                  <SelectItem value="quarterly">Trimestriel</SelectItem>
                  <SelectItem value="yearly">Annuel</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="evolution" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="evolution">Évolution temporelle</TabsTrigger>
          <TabsTrigger value="volatility">Analyse de volatilité</TabsTrigger>
          <TabsTrigger value="suppliers">Comparaison fournisseurs</TabsTrigger>
        </TabsList>

        {/* Évolution temporelle */}
        <TabsContent value="evolution" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Évolution des prix - {selectedProductData?.name}
              </CardTitle>
              <CardDescription>
                Visualisation de l'évolution des prix dans le temps avec détection des variations significatives
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-64 flex items-center justify-center">
                  <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              ) : priceEvolution.length > 0 ? (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={priceEvolution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="period" />
                      <YAxis tickFormatter={formatCurrency} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="average_price" 
                        stroke="#2563eb" 
                        strokeWidth={2}
                        name="Prix moyen"
                        dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="min_price" 
                        stroke="#10b981" 
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        name="Prix minimum"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="max_price" 
                        stroke="#ef4444" 
                        strokeWidth={1}
                        strokeDasharray="5 5"
                        name="Prix maximum"
                      />
                    </LineChart>
                  </ResponsiveContainer>

                  {/* Alertes de variation */}
                  <div className="space-y-2">
                    <h4 className="font-medium">Variations significatives détectées</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {priceEvolution.filter(item => item.is_significant).map((item, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded">
                          <AlertTriangle className="h-4 w-4 text-orange-600" />
                          <span className="text-sm">
                            {item.period}: {item.variation_percent > 0 ? '+' : ''}{item.variation_percent}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Aucune donnée d'évolution disponible pour ce produit
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analyse de volatilité */}
        <TabsContent value="volatility" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Analyse de volatilité des prix
              </CardTitle>
              <CardDescription>
                Identification des produits avec les plus fortes variations de prix
              </CardDescription>
            </CardHeader>
            <CardContent>
              {volatilityData.length > 0 ? (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={volatilityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="product.name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                      />
                      <YAxis label={{ value: 'Coefficient de variation (%)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip 
                        formatter={(value) => [`${value.toFixed(2)}%`, 'Coefficient de variation']}
                        labelFormatter={(label) => `Produit: ${label}`}
                      />
                      <Bar dataKey="statistics.coefficient_variation">
                        {volatilityData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getVolatilityColor(entry.volatility_level)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Tableau détaillé */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Produit</th>
                          <th className="text-right p-2">Prix moyen</th>
                          <th className="text-right p-2">Écart-type</th>
                          <th className="text-right p-2">Coeff. variation</th>
                          <th className="text-center p-2">Niveau</th>
                          <th className="text-right p-2">Fournisseurs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {volatilityData.map((item, index) => (
                          <tr key={index} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-medium">{item.product.name}</td>
                            <td className="p-2 text-right">{formatCurrency(item.statistics.mean_price)}</td>
                            <td className="p-2 text-right">{formatCurrency(item.statistics.std_deviation)}</td>
                            <td className="p-2 text-right">{item.statistics.coefficient_variation.toFixed(2)}%</td>
                            <td className="p-2 text-center">
                              <Badge 
                                variant="outline"
                                className={`${
                                  item.volatility_level === 'high' ? 'border-red-200 text-red-800' :
                                  item.volatility_level === 'medium' ? 'border-orange-200 text-orange-800' :
                                  'border-green-200 text-green-800'
                                }`}
                              >
                                {item.volatility_level === 'high' ? 'Élevé' :
                                 item.volatility_level === 'medium' ? 'Moyen' : 'Faible'}
                              </Badge>
                            </td>
                            <td className="p-2 text-right">{item.statistics.suppliers_count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Aucune donnée de volatilité disponible
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Comparaison fournisseurs */}
        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Comparaison des fournisseurs - {selectedProductData?.name}
              </CardTitle>
              <CardDescription>
                Analyse comparative des prix pratiqués par chaque fournisseur
              </CardDescription>
            </CardHeader>
            <CardContent>
              {supplierComparison.length > 0 ? (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={supplierComparison}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="supplier.name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        interval={0}
                      />
                      <YAxis tickFormatter={formatCurrency} />
                      <Tooltip 
                        formatter={(value) => [formatCurrency(value), 'Prix moyen']}
                        labelFormatter={(label) => `Fournisseur: ${label}`}
                      />
                      <Bar dataKey="pricing.average_price" fill="#2563eb">
                        {supplierComparison.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.is_best_price ? '#22c55e' : '#2563eb'} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>

                  {/* Tableau détaillé */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Fournisseur</th>
                          <th className="text-right p-2">Prix moyen</th>
                          <th className="text-right p-2">Prix min</th>
                          <th className="text-right p-2">Prix max</th>
                          <th className="text-center p-2">Tendance</th>
                          <th className="text-right p-2">Données</th>
                        </tr>
                      </thead>
                      <tbody>
                        {supplierComparison.map((item, index) => (
                          <tr key={index} className={`border-b hover:bg-gray-50 ${item.is_best_price ? 'bg-green-50' : ''}`}>
                            <td className="p-2 font-medium">
                              {item.supplier.name}
                              {item.is_best_price && (
                                <Badge className="ml-2 bg-green-100 text-green-800">Meilleur prix</Badge>
                              )}
                            </td>
                            <td className="p-2 text-right font-medium">{formatCurrency(item.pricing.average_price)}</td>
                            <td className="p-2 text-right">{formatCurrency(item.pricing.min_price)}</td>
                            <td className="p-2 text-right">{formatCurrency(item.pricing.max_price)}</td>
                            <td className="p-2 text-center">
                              {item.recent_trend === 'increasing' && (
                                <TrendingUp className="h-4 w-4 text-red-500 mx-auto" />
                              )}
                              {item.recent_trend === 'decreasing' && (
                                <TrendingDown className="h-4 w-4 text-green-500 mx-auto" />
                              )}
                              {item.recent_trend === 'stable' && (
                                <div className="w-4 h-0.5 bg-gray-400 mx-auto"></div>
                              )}
                            </td>
                            <td className="p-2 text-right">{item.pricing.data_points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Aucune donnée de comparaison disponible pour ce produit
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default PriceCharts

