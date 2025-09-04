import { useState, useEffect } from 'react'
import { Check, X, AlertTriangle, Plus, Edit, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'

const ValidationInterface = ({ invoiceData, onValidationComplete }) => {
  const [validationData, setValidationData] = useState(null)
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  const [products, setProducts] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [isNewProductDialogOpen, setIsNewProductDialogOpen] = useState(false)
  const [newProduct, setNewProduct] = useState({ name: '', category: '', unit: '' })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (invoiceData) {
      // Initialiser les données de validation
      const initialData = {
        invoice_number: invoiceData.parsed_data.invoice_number || '',
        invoice_date: invoiceData.parsed_data.date ? 
          new Date(invoiceData.parsed_data.date).toISOString().split('T')[0] : 
          new Date().toISOString().split('T')[0],
        supplier_name: invoiceData.parsed_data.supplier_name || '',
        total_amount: invoiceData.parsed_data.total_amount || 0,
        currency: 'EUR',
        global_confidence: invoiceData.global_confidence || 0,
        file_path: invoiceData.file_path || '',
        lines: invoiceData.parsed_data.lines.map(line => ({
          ...line,
          validation_status: line.ocr_confidence > 0.7 ? 'validated' : 'pending',
          product_id: null,
          quantity: line.quantity || 1,
          unit_price: line.unit_price || (line.total_price || 0),
          new_product_name: '',
          new_product_category: '',
          new_product_unit: ''
        }))
      }
      setValidationData(initialData)
      
      // Charger les produits et fournisseurs existants
      loadProducts()
      loadSuppliers()
    }
  }, [invoiceData])

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/invoices/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des produits:', error)
    }
  }

  const loadSuppliers = async () => {
    try {
      const response = await fetch('/api/invoices/suppliers')
      if (response.ok) {
        const data = await response.json()
        setSuppliers(data)
      }
    } catch (error) {
      console.error('Erreur lors du chargement des fournisseurs:', error)
    }
  }

  const getConfidenceLevel = (confidence) => {
    if (confidence > 0.9) return { level: 'high', label: 'Très probable', color: 'bg-green-100 text-green-800' }
    if (confidence > 0.7) return { level: 'medium', label: 'Probable', color: 'bg-yellow-100 text-yellow-800' }
    return { level: 'low', label: 'À vérifier', color: 'bg-red-100 text-red-800' }
  }

  const updateLineData = (index, field, value) => {
    setValidationData(prev => ({
      ...prev,
      lines: prev.lines.map((line, i) => 
        i === index ? { ...line, [field]: value } : line
      )
    }))
  }

  const validateLine = (index) => {
    updateLineData(index, 'validation_status', 'validated')
    if (index < validationData.lines.length - 1) {
      setCurrentLineIndex(index + 1)
    }
  }

  const rejectLine = (index) => {
    updateLineData(index, 'validation_status', 'rejected')
    if (index < validationData.lines.length - 1) {
      setCurrentLineIndex(index + 1)
    }
  }

  const createNewProduct = async () => {
    try {
      const response = await fetch('/api/invoices/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProduct),
      })

      if (response.ok) {
        const product = await response.json()
        setProducts(prev => [...prev, product])
        updateLineData(currentLineIndex, 'product_id', product.id)
        setIsNewProductDialogOpen(false)
        setNewProduct({ name: '', category: '', unit: '' })
      }
    } catch (error) {
      console.error('Erreur lors de la création du produit:', error)
    }
  }

  const saveInvoice = async () => {
    setIsSaving(true)
    try {
      const response = await fetch('/api/invoices/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(validationData),
      })

      if (response.ok) {
        const result = await response.json()
        if (onValidationComplete) {
          onValidationComplete(result)
        }
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Erreur lors de la sauvegarde')
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde:', error)
      alert('Erreur lors de la sauvegarde: ' + error.message)
    } finally {
      setIsSaving(false)
    }
  }

  if (!validationData) {
    return <div>Chargement...</div>
  }

  const currentLine = validationData.lines[currentLineIndex]
  const pendingLines = validationData.lines.filter(line => line.validation_status === 'pending')
  const confidenceLevel = getConfidenceLevel(currentLine?.ocr_confidence || 0)

  return (
    <div className="space-y-6">
      {/* En-tête de la facture */}
      <Card>
        <CardHeader>
          <CardTitle>Informations de la facture</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="invoice_number">Numéro de facture</Label>
            <Input
              id="invoice_number"
              value={validationData.invoice_number}
              onChange={(e) => setValidationData(prev => ({ ...prev, invoice_number: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="invoice_date">Date de facture</Label>
            <Input
              id="invoice_date"
              type="date"
              value={validationData.invoice_date}
              onChange={(e) => setValidationData(prev => ({ ...prev, invoice_date: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="supplier_name">Fournisseur</Label>
            <Input
              id="supplier_name"
              value={validationData.supplier_name}
              onChange={(e) => setValidationData(prev => ({ ...prev, supplier_name: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Progression de validation */}
      <Card>
        <CardHeader>
          <CardTitle>Progression de validation</CardTitle>
          <CardDescription>
            {validationData.lines.length - pendingLines.length} / {validationData.lines.length} lignes validées
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((validationData.lines.length - pendingLines.length) / validationData.lines.length) * 100}%` }}
            ></div>
          </div>
        </CardContent>
      </Card>

      {/* Validation des lignes */}
      {pendingLines.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Validation ligne {currentLineIndex + 1} / {validationData.lines.length}</span>
              <Badge className={confidenceLevel.color}>
                {confidenceLevel.label} ({Math.round((currentLine?.ocr_confidence || 0) * 100)}%)
              </Badge>
            </CardTitle>
            <CardDescription>
              Vérifiez et corrigez les informations extraites si nécessaire
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Description brute */}
            <div>
              <Label>Description extraite</Label>
              <Textarea
                value={currentLine?.raw_description || ''}
                onChange={(e) => updateLineData(currentLineIndex, 'raw_description', e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Correspondance produit */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Produit correspondant</Label>
                <Select
                  value={currentLine?.product_id?.toString() || ''}
                  onValueChange={(value) => updateLineData(currentLineIndex, 'product_id', parseInt(value))}
                >
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
              <div className="flex items-end">
                <Dialog open={isNewProductDialogOpen} onOpenChange={setIsNewProductDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Nouveau produit
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Créer un nouveau produit</DialogTitle>
                      <DialogDescription>
                        Ajoutez un nouveau produit à votre référentiel
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="new_product_name">Nom du produit</Label>
                        <Input
                          id="new_product_name"
                          value={newProduct.name}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="new_product_category">Catégorie</Label>
                        <Input
                          id="new_product_category"
                          value={newProduct.category}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, category: e.target.value }))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="new_product_unit">Unité</Label>
                        <Input
                          id="new_product_unit"
                          value={newProduct.unit}
                          onChange={(e) => setNewProduct(prev => ({ ...prev, unit: e.target.value }))}
                          placeholder="kg, pièce, litre..."
                        />
                      </div>
                      <Button onClick={createNewProduct} className="w-full">
                        Créer le produit
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Quantité et prix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="quantity">Quantité</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  value={currentLine?.quantity || ''}
                  onChange={(e) => updateLineData(currentLineIndex, 'quantity', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="unit_price">Prix unitaire (€)</Label>
                <Input
                  id="unit_price"
                  type="number"
                  step="0.01"
                  value={currentLine?.unit_price || ''}
                  onChange={(e) => updateLineData(currentLineIndex, 'unit_price', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div>
                <Label htmlFor="total_price">Prix total (€)</Label>
                <Input
                  id="total_price"
                  type="number"
                  step="0.01"
                  value={currentLine?.total_price || ''}
                  onChange={(e) => updateLineData(currentLineIndex, 'total_price', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>

            {/* Suggestions de produits */}
            {currentLine?.suggested_products && currentLine.suggested_products.length > 0 && (
              <div>
                <Label>Suggestions de produits similaires</Label>
                <div className="mt-2 space-y-2">
                  {currentLine.suggested_products.slice(0, 3).map((suggestion, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <span className="font-medium">{suggestion.product.name}</span>
                        {suggestion.product.category && (
                          <span className="text-sm text-gray-500 ml-2">({suggestion.product.category})</span>
                        )}
                        <div className="text-xs text-gray-400">
                          Similarité: {Math.round(suggestion.similarity * 100)}%
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateLineData(currentLineIndex, 'product_id', suggestion.product.id)}
                      >
                        Utiliser
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions de validation */}
            <div className="flex gap-2 pt-4">
              <Button
                onClick={() => validateLine(currentLineIndex)}
                className="flex-1"
                disabled={!currentLine?.product_id}
              >
                <Check className="h-4 w-4 mr-2" />
                Valider cette ligne
              </Button>
              <Button
                variant="destructive"
                onClick={() => rejectLine(currentLineIndex)}
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                Rejeter cette ligne
              </Button>
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentLineIndex(Math.max(0, currentLineIndex - 1))}
                disabled={currentLineIndex === 0}
              >
                Ligne précédente
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentLineIndex(Math.min(validationData.lines.length - 1, currentLineIndex + 1))}
                disabled={currentLineIndex === validationData.lines.length - 1}
              >
                Ligne suivante
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Toutes les lignes ont été validées ! Vous pouvez maintenant sauvegarder la facture.
          </AlertDescription>
        </Alert>
      )}

      {/* Bouton de sauvegarde */}
      <div className="flex justify-end">
        <Button
          onClick={saveInvoice}
          disabled={pendingLines.length > 0 || isSaving}
          size="lg"
        >
          {isSaving ? 'Sauvegarde...' : 'Sauvegarder la facture'}
        </Button>
      </div>
    </div>
  )
}

export default ValidationInterface

