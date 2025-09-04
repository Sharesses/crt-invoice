import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, TrendingDown, AlertTriangle, FileText, Package, Users, Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const Dashboard = () => {
  const [kpis, setKpis] = useState(null)
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
    loadPriceAlerts()
  }, [])

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/analytics/dashboard-kpis')
      if (response.ok) {
        const data = await response.json()
        setKpis(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des KPIs:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPriceAlerts = async () => {
    try {
      const response = await fetch('/api/analytics/price-alerts?threshold=15&days=30')
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.alerts || [])
      }
    } catch (error) {
      console.error('Erreur lors du chargement des alertes:', error)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(value)
  }

  const getVariationColor = (variation) => {
    if (variation > 0) return 'text-red-600'
    if (variation < 0) return 'text-green-600'
    return 'text-gray-600'
  }

  const getVariationIcon = (variation) => {
    if (variation > 0) return <TrendingUp className="h-4 w-4" />
    if (variation < 0) return <TrendingDown className="h-4 w-4" />
    return <div className="w-4 h-0.5 bg-gray-400"></div>
  }

  const volatilityColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6']

  if (loading) {
    return (
      <div className="space-y-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Factures</p>
                <p className="text-2xl font-bold">{kpis?.kpis.total_invoices || 0}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-600">
                {kpis?.kpis.monthly_invoices || 0} ce mois
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Produits Référencés</p>
                <p className="text-2xl font-bold">{kpis?.kpis.total_products || 0}</p>
              </div>
              <Package className="h-8 w-8 text-green-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-600">
                Dans votre référentiel
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Fournisseurs</p>
                <p className="text-2xl font-bold">{kpis?.kpis.total_suppliers || 0}</p>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-600">
                Partenaires actifs
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Évolution Prix</p>
                <div className="flex items-center gap-2">
                  <p className={`text-2xl font-bold ${getVariationColor(kpis?.kpis.global_price_variation || 0)}`}>
                    {kpis?.kpis.global_price_variation > 0 ? '+' : ''}{kpis?.kpis.global_price_variation?.toFixed(1) || 0}%
                  </p>
                  <div className={getVariationColor(kpis?.kpis.global_price_variation || 0)}>
                    {getVariationIcon(kpis?.kpis.global_price_variation || 0)}
                  </div>
                </div>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-600" />
            </div>
            <div className="mt-2 flex items-center text-sm">
              <span className="text-gray-600">
                Sur 12 mois
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Évolution globale des prix */}
      {kpis?.price_trend && kpis.price_trend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Évolution globale des prix</CardTitle>
            <CardDescription>
              Tendance moyenne des prix sur les 12 derniers mois
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={kpis.price_trend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={formatCurrency} />
                <Tooltip 
                  formatter={(value) => [formatCurrency(value), 'Prix moyen']}
                  labelFormatter={(label) => `Mois: ${label}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="average_price" 
                  stroke="#2563eb" 
                  strokeWidth={2}
                  dot={{ fill: '#2563eb', strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top produits volatils */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Produits les plus volatils
            </CardTitle>
            <CardDescription>
              Produits avec les plus fortes variations de prix
            </CardDescription>
          </CardHeader>
          <CardContent>
            {kpis?.top_volatile_products && kpis.top_volatile_products.length > 0 ? (
              <div className="space-y-3">
                {kpis.top_volatile_products.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{item.product.name}</p>
                      {item.product.category && (
                        <p className="text-sm text-gray-600">{item.product.category}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant="outline"
                        className={`${
                          item.coefficient_variation > 20 ? 'border-red-200 text-red-800' :
                          item.coefficient_variation > 10 ? 'border-orange-200 text-orange-800' :
                          'border-yellow-200 text-yellow-800'
                        }`}
                      >
                        {item.coefficient_variation.toFixed(1)}% CV
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Aucune donnée de volatilité disponible
              </div>
            )}
          </CardContent>
        </Card>

        {/* Alertes de prix */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Alertes de prix récentes
            </CardTitle>
            <CardDescription>
              Variations significatives détectées (≥15%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {alerts.slice(0, 5).map((alert, index) => (
                  <div key={index} className={`p-3 rounded-lg border ${
                    alert.alert_type === 'increase' ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium">{alert.product.name}</p>
                        <p className="text-sm text-gray-600">{alert.supplier.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatCurrency(alert.previous_price)} → {formatCurrency(alert.current_price)}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant="outline"
                          className={`${
                            alert.alert_type === 'increase' ? 'border-red-200 text-red-800' : 'border-green-200 text-green-800'
                          }`}
                        >
                          {alert.variation_percent > 0 ? '+' : ''}{alert.variation_percent.toFixed(1)}%
                        </Badge>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(alert.date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Aucune alerte de prix récente
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides */}
      <Card>
        <CardHeader>
          <CardTitle>Actions rapides</CardTitle>
          <CardDescription>
            Accès rapide aux fonctionnalités principales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <FileText className="h-8 w-8 text-blue-600 mb-2" />
              <h3 className="font-medium mb-1">Nouvelle facture</h3>
              <p className="text-sm text-gray-600">Traiter une nouvelle facture</p>
            </div>
            
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <BarChart3 className="h-8 w-8 text-green-600 mb-2" />
              <h3 className="font-medium mb-1">Analyse détaillée</h3>
              <p className="text-sm text-gray-600">Visualiser l'évolution des prix</p>
            </div>
            
            <div className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
              <Package className="h-8 w-8 text-purple-600 mb-2" />
              <h3 className="font-medium mb-1">Gérer les produits</h3>
              <p className="text-sm text-gray-600">Organiser votre référentiel</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Dashboard

