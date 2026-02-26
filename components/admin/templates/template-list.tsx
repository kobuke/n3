"use client"

import { useState, useEffect, useRef } from "react"
import { Plus, Edit, Trash, Type, Hexagon, Image as ImageIcon, UploadCloud, Loader2, AlertTriangle } from "lucide-react"
import { Button } from "@/components/admin/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/admin/ui/card"
import { Badge } from "@/components/admin/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/admin/ui/dialog"
import { Input } from "@/components/admin/ui/input"
import { Label } from "@/components/admin/ui/label"
import { Textarea } from "@/components/admin/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/admin/ui/select"
import { Switch } from "@/components/admin/ui/switch"

export function TemplateList() {
    const [templates, setTemplates] = useState<any[]>([])
    const [mounted, setMounted] = useState(false)
    const [loading, setLoading] = useState(true)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Editing State
    const [editId, setEditId] = useState<string | null>(null)

    // Deleting State (Modern confirmation)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [idToDelete, setIdToDelete] = useState<string | null>(null)
    const [isDeleting, setIsDeleting] = useState(false)

    // Form State
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [type, setType] = useState("ticket")
    const [imageUrl, setImageUrl] = useState("")
    const [isTransferable, setIsTransferable] = useState(true)
    const [contractAddress, setContractAddress] = useState(process.env.NEXT_PUBLIC_COLLECTION_ID || "")

    // Image Upload State
    const [isUploading, setIsUploading] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)

    async function fetchTemplates() {
        setLoading(true)
        try {
            const res = await fetch("/api/templates")
            const data = await res.json()
            setTemplates(Array.isArray(data) ? data : [])
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        setMounted(true)
        fetchTemplates()
    }, [])

    if (!mounted) return null

    function resetForm() {
        setEditId(null)
        setName("")
        setDescription("")
        setImageUrl("")
        setType("ticket")
        setIsTransferable(true)
        setContractAddress(process.env.NEXT_PUBLIC_COLLECTION_ID || "")
    }

    function handleEdit(t: any, e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
        setEditId(t.id)
        setName(t.name)
        setDescription(t.description || "")
        setImageUrl(t.image_url || "")
        setType(t.type)
        setIsTransferable(t.is_transferable)
        setContractAddress(t.contract_address || process.env.NEXT_PUBLIC_COLLECTION_ID || "")
        setIsDialogOpen(true)
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            const res = await fetch("/api/nfts/create", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: editId,
                    name,
                    description,
                    image_url: imageUrl,
                    type,
                    is_transferable: isTransferable,
                    contract_address: contractAddress
                })
            })

            if (res.ok) {
                setIsDialogOpen(false)
                fetchTemplates()
                resetForm()
            } else {
                const error = await res.json()
                alert(`Error: ${error.error}`)
            }
        } catch (error) {
            console.error(error)
            alert("Failed to save template")
        } finally {
            setIsSubmitting(false)
        }
    }

    async function handleFileUpload(file: File) {
        if (!file) return
        setIsUploading(true)

        const formData = new FormData()
        formData.append("file", file)

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            })

            if (res.ok) {
                const data = await res.json()
                setImageUrl(data.url)
            } else {
                const error = await res.json()
                alert(`Upload failed: ${error.error}`)
            }
        } catch (e) {
            console.error(e)
            alert("Upload failed")
        } finally {
            setIsUploading(false)
        }
    }

    function onDragOver(e: React.DragEvent) {
        e.preventDefault()
        setIsDragging(true)
    }

    function onDragLeave(e: React.DragEvent) {
        e.preventDefault()
        setIsDragging(false)
    }

    function onDrop(e: React.DragEvent) {
        e.preventDefault()
        setIsDragging(false)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0])
            e.dataTransfer.clearData()
        }
    }

    function confirmDelete(id: string, e: React.MouseEvent) {
        e.preventDefault()
        e.stopPropagation()
        setIdToDelete(id)
        setIsDeleteDialogOpen(true)
    }

    async function handleConfirmDelete() {
        if (!idToDelete) return
        setIsDeleting(true)

        try {
            const res = await fetch(`/api/templates/${idToDelete}`, {
                method: "DELETE"
            })

            if (res.ok) {
                setIsDeleteDialogOpen(false)
                fetchTemplates()
            } else {
                const error = await res.json()
                alert(`Error: ${error.error}`)
            }
        } catch (error) {
            console.error(error)
            alert("Failed to delete template")
        } finally {
            setIsDeleting(false)
            setIdToDelete(null)
        }
    }

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-semibold tracking-tight">Your Templates</h2>
                    <p className="text-sm text-muted-foreground">Manage templates to be minted on Shopify orders.</p>
                </div>

                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    if (!open) resetForm()
                    setIsDialogOpen(open)
                }}>
                    <DialogTrigger asChild>
                        <Button className="gap-2" onClick={() => resetForm()}>
                            <Plus className="size-4" /> Create Template
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>{editId ? "Edit NFT Template" : "Create NFT Template"}</DialogTitle>
                            <DialogDescription>
                                Define the metadata for the NFT that will be minted to the user.
                            </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="name">Template Name *</Label>
                                        <Input id="name" value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Bronze Resort Ticket" />
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="type">Template Type</Label>
                                        <Select value={type} onValueChange={setType}>
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="ticket">Ticket / Voucher</SelectItem>
                                                <SelectItem value="tour">Tour Pass</SelectItem>
                                                <SelectItem value="resident_card">Digital Resident Card</SelectItem>
                                                <SelectItem value="artwork">Artwork</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            value={description}
                                            onChange={e => setDescription(e.target.value)}
                                            placeholder="Special discount ticket for regular customers"
                                            rows={5}
                                        />
                                    </div>
                                </div>

                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-col gap-2">
                                        <Label>Template Image</Label>
                                        <div
                                            className={`relative flex flex-col items-center justify-center min-h-[160px] border-2 border-dashed rounded-lg transition-colors overflow-hidden
                                                ${isDragging ? 'border-primary bg-primary/5' : 'border-border bg-muted/30 hover:bg-muted/50'}
                                                ${imageUrl ? 'border-none p-0' : 'p-6 cursor-pointer'}
                                            `}
                                            onDragOver={onDragOver}
                                            onDragLeave={onDragLeave}
                                            onDrop={onDrop}
                                            onClick={() => !imageUrl && fileInputRef.current?.click()}
                                        >
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                className="hidden"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    if (e.target.files && e.target.files[0]) {
                                                        handleFileUpload(e.target.files[0])
                                                    }
                                                }}
                                            />
                                            {isUploading ? (
                                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                    <Loader2 className="size-6 animate-spin" />
                                                    <span className="text-sm">Uploading...</span>
                                                </div>
                                            ) : imageUrl ? (
                                                <div className="relative w-full h-full group/preview">
                                                    <img src={imageUrl} alt="Template Preview" className="w-full h-48 object-cover rounded-md" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/preview:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 rounded-md">
                                                        <Button type="button" variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
                                                            Change Image
                                                        </Button>
                                                        <Button type="button" variant="destructive" size="sm" onClick={() => setImageUrl("")}>
                                                            Remove
                                                        </Button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                                    <UploadCloud className="size-8 mb-2 opacity-50" />
                                                    <p className="text-sm font-medium">Click to upload or drag and drop</p>
                                                    <p className="text-xs opacity-70">PNG, JPG or GIF (max 5MB)</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 mt-2">
                                        <Label>Transferable (SBT or NFT)</Label>
                                        <div className="flex items-center space-x-2 border rounded-md p-3">
                                            <Switch id="transferable" checked={isTransferable} onCheckedChange={setIsTransferable} />
                                            <Label htmlFor="transferable" className="font-normal cursor-pointer">
                                                {isTransferable ? "Yes, users can transfer/sell this NFT" : "No, Bound to wallet (SBT)"}
                                            </Label>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <Label htmlFor="contract_address">Target Contract Address <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                                        <Input id="contract_address" value={contractAddress} onChange={e => setContractAddress(e.target.value)} placeholder="0x..." />
                                        <p className="text-[10px] text-muted-foreground">Default collection used if blank.</p>
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={isSubmitting || isUploading}>
                                    {isSubmitting ? "Saving..." : (editId ? "Save Changes" : "Create Template")}
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Deletion Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="size-5" /> Delete Template
                        </DialogTitle>
                        <DialogDescription>
                            このテンプレートを削除してもよろしいですか？この操作は取り消せません。
                            <br /><br />
                            <span className="text-xs font-semibold text-muted-foreground">※Shopify商品に紐付いている場合は削除できません。</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>Cancel</Button>
                        <Button variant="destructive" onClick={handleConfirmDelete} disabled={isDeleting}>
                            {isDeleting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Trash className="size-4 mr-2" />}
                            Delete Template
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full flex justify-center py-12">
                        <Loader2 className="size-8 animate-spin text-muted-foreground" />
                    </div>
                ) : templates.length === 0 ? (
                    <p className="text-sm text-muted-foreground col-span-full">No templates found. Create one above.</p>
                ) : (
                    templates.map(t => (
                        <Card key={t.id} className="overflow-hidden flex flex-col group relative">
                            <div className="aspect-video w-full bg-muted flex items-center justify-center relative border-b">
                                {t.image_url ? (
                                    <img src={t.image_url} alt={t.name} className="w-full h-full object-cover" />
                                ) : (
                                    <ImageIcon className="size-10 text-muted-foreground/30" />
                                )}
                                <div className="absolute top-2 right-2 flex gap-2">
                                    <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm border-0 capitalize">
                                        {t.type.replace('_', ' ')}
                                    </Badge>
                                    {!t.is_transferable && (
                                        <Badge variant="destructive" className="bg-destructive/80 backdrop-blur-sm border-0">
                                            SBT
                                        </Badge>
                                    )}
                                </div>
                                {/* Hover overlay for Edit/Delete */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <Button variant="secondary" size="sm" onClick={(e) => handleEdit(t, e)} className="gap-2">
                                        <Edit className="size-4" /> Edit
                                    </Button>
                                    <Button variant="destructive" size="sm" onClick={(e) => confirmDelete(t.id, e)} className="gap-2">
                                        <Trash className="size-4" /> Delete
                                    </Button>
                                </div>
                            </div>
                            <CardContent className="flex-1 p-5 flex flex-col gap-3">
                                <div className="flex justify-between items-start gap-4">
                                    <h3 className="font-semibold line-clamp-1">{t.name}</h3>
                                </div>
                                <p className="text-sm text-muted-foreground line-clamp-2">{t.description || "No description provided."}</p>
                                <div className="mt-auto pt-4 flex items-center justify-between text-xs text-muted-foreground border-t">
                                    <div className="flex items-center gap-1.5 truncate">
                                        <Hexagon className="size-3 text-primary/70" />
                                        <span className="truncate">{t.contract_address ? t.contract_address.slice(0, 8) + '...' + t.contract_address.slice(-6) : 'Default Contract'}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
