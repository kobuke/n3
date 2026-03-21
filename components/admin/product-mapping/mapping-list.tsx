"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Card, CardContent } from "@/components/admin/ui/card"
import { Badge } from "@/components/admin/ui/badge"
import { Button } from "@/components/admin/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/admin/ui/dropdown-menu"
import { Link2, Unlink, Save, ShoppingBag, Hexagon, Loader2, RefreshCw, ImageIcon } from "lucide-react"

type ShopifyProduct = {
  id: string
  title: string
  sku: string
  price: string
  image: string
  status: "active" | "draft"
}

type ContractTemplate = {
  id: string
  name: string
  contractAddress: string
  image_url?: string
}

type Mapping = {
  product: ShopifyProduct
  templateId: string | null
}

export function MappingList() {
  const [products, setProducts] = useState<ShopifyProduct[]>([])
  const [templates, setTemplates] = useState<ContractTemplate[]>([])
  const [mappings, setMappings] = useState<Record<string, string[]>>({}) // productId -> templateIds[]
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [pendingChanges, setPendingChanges] = useState<Record<string, string[]>>({})

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

        setProducts(Array.isArray(productsData) ? productsData : (productsData.data || []))
        setTemplates(Array.isArray(templatesData) ? templatesData : [])

        const mappingMap: Record<string, string[]> = {}
        if (Array.isArray(mappingsData)) {
          mappingsData.forEach((m: any) => {
            const ids = m.nft_template_ids || (m.nft_template_id ? [m.nft_template_id] : [])
            mappingMap[m.shopify_product_id] = ids
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

  function handleTemplateToggle(productId: string, templateId: string) {
    setPendingChanges(prev => {
      const currentIds = prev[productId] !== undefined ? prev[productId] : (mappings[productId] || [])
      const newIds = currentIds.includes(templateId)
        ? currentIds.filter(id => id !== templateId)
        : [...currentIds, templateId]
      return { ...prev, [productId]: newIds }
    })
  }

  async function handleSave() {
    setSaving(true)
    const promises = Object.entries(pendingChanges).map(([productId, templateIds]) => {
      return fetch('/api/mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shopify_product_id: productId, nft_template_ids: templateIds })
      })
    })

    await Promise.all(promises)

    setMappings(prev => {
      const next = { ...prev }
      Object.entries(pendingChanges).forEach(([pid, tids]) => {
        next[pid] = tids
      })
      return next
    })
    setPendingChanges({})
    setSaving(false)
  }

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>

  const currentMappings = { ...mappings, ...pendingChanges }
  const activeCount = Object.values(currentMappings).filter(ids => ids.length > 0).length

  const productIds = new Set(products.map(p => p.id))
  const orphanedProductIds = Object.keys(mappings).filter(id => !productIds.has(id))

  return (
    <div className="flex flex-col gap-6">
      {/* Summary bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link2 className="size-4" />
            <span>
              <span className="font-semibold text-foreground">{activeCount}</span>
              {" / "}{products.length} 件紐付け済み
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="gap-2">
            <RefreshCw className="size-3.5" />
            再同期
          </Button>
        </div>
        {Object.keys(pendingChanges).length > 0 && (
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="animate-spin size-4" /> : <Save className="size-4" />}
            変更を保存
          </Button>
        )}
      </div>

      {/* Mapping cards */}
      <div className="flex flex-col gap-4">
        {products.map((product) => {
          const currentTemplateIds = pendingChanges[product.id] !== undefined ? pendingChanges[product.id] : (mappings[product.id] || [])
          const isLinked = currentTemplateIds.length > 0
          const selectedTemplates = templates.filter(t => currentTemplateIds.includes(t.id))

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
                  {/* Shopify product with image */}
                  <div className="flex items-center gap-4">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-secondary overflow-hidden border border-border/50">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.title}
                          width={56}
                          height={56}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <ShoppingBag className="size-5 text-muted-foreground" />
                      )}
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
                          {product.status === "active" ? "公開中" : "下書き"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {product.sku && <span className="font-mono">{product.sku}</span>}
                        {product.price && <span>{product.price}</span>}
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

                  {/* NFT template selector */}
                  <div className="flex items-center gap-3">
                    <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-secondary overflow-hidden border border-border/50 relative">
                      {selectedTemplates.length > 0 && (selectedTemplates[0] as any).image_url ? (
                        <>
                          <Image
                            src={(selectedTemplates[0] as any).image_url}
                            alt={selectedTemplates[0].name}
                            width={56}
                            height={56}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                          {selectedTemplates.length > 1 && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold">
                              +{selectedTemplates.length - 1}
                            </div>
                          )}
                        </>
                      ) : (
                        <Hexagon className="size-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        NFTテンプレート ({currentTemplateIds.length}選択中)
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-56 justify-start text-left font-normal border-border/60 hover:bg-muted/50">
                            {currentTemplateIds.length === 0 ? (
                              <span className="text-muted-foreground">テンプレートを選択...</span>
                            ) : (
                              <span className="truncate">{selectedTemplates.map(t => t.name).join(", ")}</span>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 max-h-64 overflow-y-auto">
                          {templates.map((template) => (
                            <DropdownMenuCheckboxItem
                              key={template.id}
                              checked={currentTemplateIds.includes(template.id)}
                              onCheckedChange={() => handleTemplateToggle(product.id, template.id)}
                            >
                              {template.name}
                            </DropdownMenuCheckboxItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      {orphanedProductIds.length > 0 && (
        <div className="mt-8 pt-6 border-t border-destructive/20">
          <div className="flex items-center gap-2 mb-4">
             <div className="size-2 rounded-full bg-destructive animate-pulse" />
             <h3 className="text-md font-semibold text-destructive">Shopifyから削除された商品の紐付け（幽霊マッピング）</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Shopify側で商品が削除されましたが、N3側に紐付けデータだけが残っています。これが原因でテンプレートが削除できない場合があります。以下のチェックを外して保存し、紐付けを解除してください。
          </p>
          <div className="flex flex-col gap-4">
            {orphanedProductIds.map((productId) => {
              const currentTemplateIds = pendingChanges[productId] !== undefined ? pendingChanges[productId] : (mappings[productId] || [])
              const selectedTemplates = templates.filter(t => currentTemplateIds.includes(t.id))
              
              if (currentTemplateIds.length === 0) return null; // Already unlinked

              return (
                <Card key={productId} className="border-destructive/30 bg-destructive/5">
                  <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="font-mono text-xs text-muted-foreground bg-white/50 px-2 py-1 rounded inline-block mb-1">
                        Product ID: {productId}
                      </div>
                      <div className="text-sm font-semibold text-destructive">
                        存在しない商品
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        該当テンプレート ({currentTemplateIds.length} 個)
                      </span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="w-56 justify-start text-left font-normal border-destructive/20">
                            <span className="truncate">{selectedTemplates.map(t => t.name).join(", ")}</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 max-h-64 overflow-y-auto">
                          {templates.map((template) => (
                            <DropdownMenuCheckboxItem
                              key={template.id}
                              checked={currentTemplateIds.includes(template.id)}
                              onCheckedChange={() => handleTemplateToggle(productId, template.id)}
                            >
                              {template.name}
                            </DropdownMenuCheckboxItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
