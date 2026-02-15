"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Link2, Unlink, Save, ShoppingBag, Hexagon, Loader2, RefreshCw } from "lucide-react"

type ShopifyProduct = {
  id: string
  title: string
  sku: string
  price: string
  image: string
  status: "active" | "draft"
}

type CrossmintTemplate = {
  id: string
  name: string
  collectionName: string
}

type Mapping = {
  product: ShopifyProduct
  templateId: string | null
}

export function MappingList() {
  const [products, setProducts] = useState<ShopifyProduct[]>([])
  const [templates, setTemplates] = useState<CrossmintTemplate[]>([])
  const [mappings, setMappings] = useState<Record<string, string>>({}) // productId -> templateId
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<Record<string, string | null>>({})

  useEffect(() => {
    async function fetchData() {
      try {
        const [productsRes, templatesRes, mappingsRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/templates'),
          fetch('/api/mappings')
        ])

        const productsData = await productsRes.json()
        const templatesData = await templatesRes.json()
        const mappingsData = await mappingsRes.json()

        setProducts(productsData)
        setTemplates(templatesData)

        const mappingMap: Record<string, string> = {}
        if (Array.isArray(mappingsData)) {
          mappingsData.forEach((m: any) => {
            mappingMap[m.shopify_product_id] = m.crossmint_template_id
          })
        }
        setMappings(mappingMap)
        setLoading(false)
      } catch (error) {
        console.error(error)
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  function handleTemplateChange(productId: string, templateId: string | null) {
    setPendingChanges(prev => ({ ...prev, [productId]: templateId }))
  }

  async function handleSave() {
    setSaving(true)
    const promises = Object.entries(pendingChanges).map(([productId, templateId]) => {
      if (templateId) {
        return fetch('/api/mappings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shopify_product_id: productId, crossmint_template_id: templateId })
        })
      }
      return Promise.resolve() // Handle unlink later if needed
    })

    await Promise.all(promises)

    // Update local state
    setMappings(prev => {
      const next = { ...prev }
      Object.entries(pendingChanges).forEach(([pid, tid]) => {
        if (tid) next[pid] = tid
      })
      return next
    })
    setPendingChanges({})
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>

  const linkedCount = Object.keys(mappings).length + Object.keys(pendingChanges).filter(k => pendingChanges[k]).length - Object.keys(pendingChanges).filter(k => mappings[k] && !pendingChanges[k]).length // Approximation
  // Simplified count logic:
  const currentMappings = { ...mappings, ...pendingChanges }
  const activeCount = Object.values(currentMappings).filter(Boolean).length

  return (
    <div className="flex flex-col gap-6">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link2 className="size-4" />
            <span>
              <span className="font-semibold text-foreground">{activeCount}</span>
              {" / "}{products.length}{" products linked"}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="gap-2">
            <RefreshCw className="size-3.5" />
            Sync Products
          </Button>
        </div>
        {Object.keys(pendingChanges).length > 0 && (
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="animate-spin size-4" /> : <Save className="size-4" />}
            Save Changes
          </Button>
        )}
      </div>

      {/* Mapping cards */}
      <div className="flex flex-col gap-4">
        {products.map((product) => {
          const currentTemplateId = pendingChanges[product.id] !== undefined ? pendingChanges[product.id] : mappings[product.id]
          const isLinked = !!currentTemplateId
          const selectedTemplate = templates.find(t => t.id === currentTemplateId)

          return (
            <Card
              key={product.id}
              className={
                isLinked
                  ? "border-primary/20 bg-primary/[0.02]"
                  : "border-border"
              }
            >
              <CardContent className="p-0">
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  {/* Shopify product */}
                  <div className="flex items-center gap-4">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      <ShoppingBag className="size-5 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">
                          {product.title}
                        </span>
                        <Badge
                          variant={
                            product.status === "active"
                              ? "default"
                              : "secondary"
                          }
                          className={
                            product.status === "active"
                              ? "bg-success/10 text-success hover:bg-success/20 border-0 text-xs"
                              : "text-xs"
                          }
                        >
                          {product.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-mono">{product.sku}</span>
                        <span>{product.price}</span>
                      </div>
                    </div>
                  </div>

                  {/* Arrow / link indicator */}
                  <div className="hidden sm:flex items-center px-4">
                    {isLinked ? (
                      <div className="flex items-center gap-2 text-primary">
                        <div className="h-px w-8 bg-primary/40" />
                        <Link2 className="size-4" />
                        <div className="h-px w-8 bg-primary/40" />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground/40">
                        <div className="h-px w-8 bg-border" />
                        <Unlink className="size-4" />
                        <div className="h-px w-8 bg-border" />
                      </div>
                    )}
                  </div>

                  {/* Crossmint template selector */}
                  <div className="flex items-center gap-3">
                    <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-secondary">
                      <Hexagon className="size-5 text-muted-foreground" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        Crossmint Template
                      </span>
                      <Select
                        value={currentTemplateId || "none"}
                        onValueChange={(value) =>
                          handleTemplateChange(
                            product.id,
                            value === "none" ? null : value
                          )
                        }
                      >
                        <SelectTrigger className="w-56">
                          <SelectValue placeholder="Select template..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            Not linked
                          </SelectItem>
                          {templates.map((template) => (
                            <SelectItem key={template.id} value={template.id}>
                              <div className="flex flex-col">
                                <span>{template.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedTemplate && (
                        <span className="text-xs text-muted-foreground">
                          {"Collection: "}{selectedTemplate.collectionName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
