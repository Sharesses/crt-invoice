import { useState } from 'react'
import { FileText, BarChart3, Settings, Home, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import UploadForm from './components/UploadForm'
import ValidationInterface from './components/ValidationInterface'
import Dashboard from './components/Dashboard'
import PriceCharts from './components/PriceCharts'
import './App.css'

function App() {
  const [currentStep, setCurrentStep] = useState('dashboard') // dashboard, upload, validation, analytics
  const [uploadedInvoice, setUploadedInvoice] = useState(null)
  const [validatedInvoice, setValidatedInvoice] = useState(null)

  const handleUploadSuccess = (invoiceData) => {
    setUploadedInvoice(invoiceData)
    setCurrentStep('validation')
  }

  const handleValidationComplete = (validationResult) => {
    setValidatedInvoice(validationResult)
    setCurrentStep('analytics')
  }

  const resetWorkflow = () => {
    setCurrentStep('upload')
    setUploadedInvoice(null)
    setValidatedInvoice(null)
  }

  const goToDashboard = () => {
    setCurrentStep('dashboard')
  }

  const goToAnalytics = () => {
    setCurrentStep('analytics')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">CRT Invoice Analytics</h1>
                <p className="text-sm text-gray-500">Traitement intelligent des factures</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={goToDashboard}>
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <Button variant="outline" onClick={goToAnalytics}>
                <TrendingUp className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <Button variant="outline" onClick={resetWorkflow}>
                <FileText className="h-4 w-4 mr-2" />
                Nouvelle facture
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Dashboard */}
        {currentStep === 'dashboard' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard CRT</h2>
              <p className="text-gray-600">Vue d'ensemble de votre activité et des tendances de prix</p>
            </div>
            <Dashboard />
          </div>
        )}

        {/* Analytics */}
        {currentStep === 'analytics' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Analyse des prix et volatilité</h2>
              <p className="text-gray-600">Visualisez l'évolution et la volatilité des prix de vos produits</p>
            </div>
            <PriceCharts />
          </div>
        )}

        {/* Workflow Steps for Invoice Processing */}
        {(currentStep === 'upload' || currentStep === 'validation') && (
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-8">
              {/* Step 1: Upload */}
              <div className={`flex items-center ${currentStep === 'upload' ? 'text-blue-600' : currentStep === 'validation' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === 'upload' ? 'bg-blue-100 text-blue-600' : 
                  currentStep === 'validation' ? 'bg-green-100 text-green-600' : 
                  'bg-gray-100 text-gray-400'
                }`}>
                  1
                </div>
                <span className="ml-2 font-medium">Upload & OCR</span>
              </div>

              <div className={`w-16 h-0.5 ${currentStep === 'validation' ? 'bg-green-600' : 'bg-gray-300'}`}></div>

              {/* Step 2: Validation */}
              <div className={`flex items-center ${currentStep === 'validation' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === 'validation' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
                }`}>
                  2
                </div>
                <span className="ml-2 font-medium">Validation Assistée</span>
              </div>
            </div>
          </div>
        )}

        {/* Upload Step */}
        {currentStep === 'upload' && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload de votre facture</h2>
              <p className="text-gray-600">Commencez par télécharger une facture pour l'analyser</p>
            </div>
            <UploadForm onUploadSuccess={handleUploadSuccess} />
          </div>
        )}

        {/* Validation Step */}
        {currentStep === 'validation' && uploadedInvoice && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Validation des données extraites</h2>
              <p className="text-gray-600">Vérifiez et corrigez les informations extraites de votre facture</p>
            </div>
            <ValidationInterface 
              invoiceData={uploadedInvoice} 
              onValidationComplete={handleValidationComplete}
            />
          </div>
        )}

        {/* Success message after validation */}
        {validatedInvoice && currentStep !== 'analytics' && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Facture sauvegardée avec succès
              </CardTitle>
              <CardDescription>
                Votre facture a été traitée et ajoutée à votre base de données. 
                Les analyses de prix sont maintenant disponibles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    {validatedInvoice.invoice_id}
                  </div>
                  <div className="text-sm text-gray-600">ID Facture</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    {uploadedInvoice.parsed_data.lines.length}
                  </div>
                  <div className="text-sm text-gray-600">Lignes traitées</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    {Math.round(uploadedInvoice.global_confidence * 100)}%
                  </div>
                  <div className="text-sm text-gray-600">Confiance OCR</div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button onClick={goToAnalytics} className="flex-1">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Voir les analyses de prix
                </Button>
                <Button onClick={resetWorkflow} variant="outline" className="flex-1">
                  <FileText className="h-4 w-4 mr-2" />
                  Traiter une nouvelle facture
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default App

