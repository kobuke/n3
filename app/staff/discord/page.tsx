"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, RefreshCw, Shield, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type RoleMapping = {
    id: number;
    collection_address: string;
    collection_name: string | null;
    discord_role_id: string;
    discord_role_name: string | null;
    description: string | null;
    is_active: boolean;
};

type GuildRole = {
    id: string;
    name: string;
    color: number;
    position: number;
};

type Template = {
    id: string;
    name: string;
    contract_address?: string;
};

export default function DiscordSettingsPage() {
    const [mappings, setMappings] = useState<RoleMapping[]>([]);
    const [guildRoles, setGuildRoles] = useState<GuildRole[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(true);

    // New mapping form
    const [selectedTemplateId, setSelectedTemplateId] = useState("");
    const [selectedRoleId, setSelectedRoleId] = useState("");
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [rolesRes, templatesRes] = await Promise.all([
                fetch("/api/discord/roles"),
                fetch("/api/templates"),
            ]);
            if (!rolesRes.ok) throw new Error("Failed to fetch");
            const rolesData = await rolesRes.json();
            setMappings(rolesData.mappings || []);
            setGuildRoles(rolesData.guildRoles || []);

            const templatesData = await templatesRes.json();
            if (Array.isArray(templatesData)) setTemplates(templatesData);
        } catch (err) {
            toast.error("データの取得に失敗しました");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    async function handleAddMapping(e: React.FormEvent) {
        e.preventDefault();
        if (!selectedTemplateId || !selectedRoleId) {
            toast.error("テンプレートとDiscordロールを選択してください");
            return;
        }

        setSaving(true);
        try {
            const template = templates.find((t) => t.id === selectedTemplateId);
            const selectedRole = guildRoles.find((r) => r.id === selectedRoleId);
            const collectionAddress = template?.contract_address || process.env.NEXT_PUBLIC_COLLECTION_ID || "";

            const res = await fetch("/api/discord/roles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    collection_address: collectionAddress,
                    collection_name: template?.name || null,
                    discord_role_id: selectedRoleId,
                    discord_role_name: selectedRole?.name || null,
                    description: null,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to save");
            }

            toast.success("マッピングを保存しました");
            setSelectedTemplateId("");
            setSelectedRoleId("");
            fetchData();
        } catch (err: any) {
            toast.error(err.message || "保存に失敗しました");
        } finally {
            setSaving(false);
        }
    }

    async function handleDeleteMapping(id: number) {
        if (!confirm("このマッピングを削除しますか？")) return;

        try {
            const res = await fetch("/api/discord/roles", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id }),
            });

            if (!res.ok) throw new Error("Delete failed");

            toast.success("マッピングを削除しました");
            fetchData();
        } catch {
            toast.error("削除に失敗しました");
        }
    }

    // Filter out guild roles that are managed by bots (@everyone, etc.)
    const selectableRoles = guildRoles.filter(
        (r) => r.name !== "@everyone" && r.name !== "新しいロール"
    );

    return (
        <div className="flex flex-col">
            <div className="border-b px-6 py-4">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Discord ロール管理
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    NFTテンプレートとDiscordロールの紐づけを管理します
                </p>
            </div>

            <div className="flex flex-1 flex-col gap-6 p-6">
                {/* Add New Mapping */}
                <Card>
                    <CardHeader className="pb-3">
                        <h2 className="text-base font-semibold flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            新しいマッピングを追加
                        </h2>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleAddMapping} className="flex flex-col gap-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">
                                        NFTテンプレート *
                                    </label>
                                    <select
                                        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                        value={selectedTemplateId}
                                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                                        required
                                    >
                                        <option value="">テンプレートを選択...</option>
                                        {templates.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                {t.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">
                                        Discordロール *
                                    </label>
                                    {selectableRoles.length > 0 ? (
                                        <select
                                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={selectedRoleId}
                                            onChange={(e) => setSelectedRoleId(e.target.value)}
                                            required
                                        >
                                            <option value="">ロールを選択...</option>
                                            {selectableRoles.map((role) => (
                                                <option key={role.id} value={role.id}>
                                                    {role.name}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="flex items-center h-10 px-3 text-sm text-muted-foreground border rounded-md bg-muted/30">
                                            Discordサーバーのロールを読み込み中...
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Button type="submit" disabled={saving} className="self-start">
                                {saving ? "保存中..." : "マッピングを追加"}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Current Mappings */}
                <Card>
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                        <h2 className="text-base font-semibold flex items-center gap-2">
                            <Link2 className="w-4 h-4" />
                            現在のマッピング
                        </h2>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={fetchData}
                            disabled={loading}
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <span className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                            </div>
                        ) : mappings.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                マッピングがまだ登録されていません
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {mappings.map((mapping) => (
                                    <div
                                        key={mapping.id}
                                        className="flex items-center justify-between p-3 rounded-lg border bg-card"
                                    >
                                        <div className="flex flex-col gap-1 min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-medium">
                                                    {mapping.collection_name || "名称なし"}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground">→</span>
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs"
                                                >
                                                    @{mapping.discord_role_name || mapping.discord_role_id}
                                                </Badge>
                                            </div>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleDeleteMapping(mapping.id)}
                                            className="text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
