"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, RefreshCw, Shield, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function DiscordSettingsPage() {
    const [mappings, setMappings] = useState<RoleMapping[]>([]);
    const [guildRoles, setGuildRoles] = useState<GuildRole[]>([]);
    const [loading, setLoading] = useState(true);

    // New mapping form
    const [collectionAddress, setCollectionAddress] = useState("");
    const [collectionName, setCollectionName] = useState("");
    const [selectedRoleId, setSelectedRoleId] = useState("");
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/discord/roles");
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();
            setMappings(data.mappings || []);
            setGuildRoles(data.guildRoles || []);
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
        if (!collectionAddress || !selectedRoleId) {
            toast.error("コレクションアドレスとロールIDを入力してください");
            return;
        }

        setSaving(true);
        try {
            const selectedRole = guildRoles.find((r) => r.id === selectedRoleId);
            const res = await fetch("/api/discord/roles", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    collection_address: collectionAddress,
                    collection_name: collectionName || null,
                    discord_role_id: selectedRoleId,
                    discord_role_name: selectedRole?.name || null,
                    description: description || null,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Failed to save");
            }

            toast.success("マッピングを保存しました");
            setCollectionAddress("");
            setCollectionName("");
            setSelectedRoleId("");
            setDescription("");
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

    function getRoleColor(color: number): string {
        if (color === 0) return "#99aab5";
        return `#${color.toString(16).padStart(6, "0")}`;
    }

    return (
        <div className="flex flex-col">
            <div className="border-b px-6 py-4">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <Shield className="w-5 h-5" />
                    Discord ロール管理
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    NFTコレクションとDiscordロールの紐づけを管理します
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
                                        NFTコレクションアドレス *
                                    </label>
                                    <Input
                                        placeholder="0x..."
                                        value={collectionAddress}
                                        onChange={(e) => setCollectionAddress(e.target.value)}
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">
                                        コレクション名（任意）
                                    </label>
                                    <Input
                                        placeholder="Nanjo NFT Ticket"
                                        value={collectionName}
                                        onChange={(e) => setCollectionName(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">
                                        Discordロール *
                                    </label>
                                    {guildRoles.length > 0 ? (
                                        <select
                                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={selectedRoleId}
                                            onChange={(e) => setSelectedRoleId(e.target.value)}
                                            required
                                        >
                                            <option value="">ロールを選択...</option>
                                            {guildRoles.map((role) => (
                                                <option key={role.id} value={role.id}>
                                                    {role.name}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <Input
                                            placeholder="ロールIDを入力（例: 123456789012345678）"
                                            value={selectedRoleId}
                                            onChange={(e) => setSelectedRoleId(e.target.value)}
                                            required
                                        />
                                    )}
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">
                                        説明（任意）
                                    </label>
                                    <Input
                                        placeholder="チケット保有者用ロール"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                    />
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
                                                    {mapping.collection_name || "Unnamed Collection"}
                                                </span>
                                                <Badge
                                                    variant="outline"
                                                    className="font-mono text-xs truncate max-w-[200px]"
                                                >
                                                    {mapping.collection_address}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs text-muted-foreground">→</span>
                                                <Badge
                                                    style={{
                                                        backgroundColor: `${getRoleColor(0)}20`,
                                                        borderColor: getRoleColor(0),
                                                        color: getRoleColor(0),
                                                    }}
                                                    variant="outline"
                                                    className="text-xs"
                                                >
                                                    @{mapping.discord_role_name || mapping.discord_role_id}
                                                </Badge>
                                                {mapping.description && (
                                                    <span className="text-xs text-muted-foreground">
                                                        {mapping.description}
                                                    </span>
                                                )}
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
