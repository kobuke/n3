"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Eye, EyeOff, Save, TestTube, CheckCircle2 } from "lucide-react"

export function SettingsForm() {
  const [showShopifyKey, setShowShopifyKey] = useState(false)
  const [showCrossmintKey, setShowCrossmintKey] = useState(false)
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [autoRetry, setAutoRetry] = useState(false)

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      {/* API Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">API Configuration</CardTitle>
          <CardDescription>
            Manage your Shopify and Crossmint API credentials
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {/* Shopify */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="shopify-key">Shopify API Key</Label>
              <Badge className="bg-success/10 text-success hover:bg-success/20 border-0 gap-1">
                <CheckCircle2 className="size-3" />
                Connected
              </Badge>
            </div>
            <div className="relative">
              <Input
                id="shopify-key"
                type={showShopifyKey ? "text" : "password"}
                defaultValue="shpat_xxxxxxxxxxxxxxxxxxxx"
                className="pr-10 font-mono text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
                onClick={() => setShowShopifyKey(!showShopifyKey)}
              >
                {showShopifyKey ? (
                  <EyeOff className="size-3.5" />
                ) : (
                  <Eye className="size-3.5" />
                )}
                <span className="sr-only">Toggle visibility</span>
              </Button>
            </div>
          </div>

          {/* Shopify Store URL */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="shopify-store">Shopify Store URL</Label>
            <Input
              id="shopify-store"
              defaultValue="nomad-resort.myshopify.com"
              className="text-sm"
            />
          </div>

          <Separator />

          {/* Crossmint */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="crossmint-key">Crossmint API Key</Label>
              <Badge className="bg-success/10 text-success hover:bg-success/20 border-0 gap-1">
                <CheckCircle2 className="size-3" />
                Connected
              </Badge>
            </div>
            <div className="relative">
              <Input
                id="crossmint-key"
                type={showCrossmintKey ? "text" : "password"}
                defaultValue="sk_production_xxxxxxxxxxxxxxxxxxxx"
                className="pr-10 font-mono text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 size-7"
                onClick={() => setShowCrossmintKey(!showCrossmintKey)}
              >
                {showCrossmintKey ? (
                  <EyeOff className="size-3.5" />
                ) : (
                  <Eye className="size-3.5" />
                )}
                <span className="sr-only">Toggle visibility</span>
              </Button>
            </div>
          </div>

          {/* Crossmint Project ID */}
          <div className="flex flex-col gap-2">
            <Label htmlFor="crossmint-project">Crossmint Project ID</Label>
            <Input
              id="crossmint-project"
              defaultValue="prj_nomad_resort_production"
              className="font-mono text-sm"
            />
          </div>

          <div className="flex gap-3">
            <Button className="gap-2">
              <Save className="size-4" />
              Save Configuration
            </Button>
            <Button variant="outline" className="gap-2">
              <TestTube className="size-4" />
              Test Connection
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
          <CardDescription>
            Configure alert preferences for mint failures and system events
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <Label>Email Notifications</Label>
              <span className="text-xs text-muted-foreground">
                Receive email alerts when a mint fails
              </span>
            </div>
            <Switch
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>

          {emailNotifications && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="notification-email">Notification Email</Label>
              <Input
                id="notification-email"
                type="email"
                defaultValue="admin@nomadresort.io"
                className="text-sm"
              />
            </div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <Label>Auto-Retry Failed Mints</Label>
              <span className="text-xs text-muted-foreground">
                Automatically retry failed mints up to 3 times
              </span>
            </div>
            <Switch
              checked={autoRetry}
              onCheckedChange={setAutoRetry}
            />
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhook Configuration</CardTitle>
          <CardDescription>
            Shopify webhook endpoint for order processing
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label>Webhook URL</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value="https://api.nomadresort.io/webhooks/shopify/orders-paid"
                className="font-mono text-sm bg-muted"
              />
              <Button variant="outline" size="sm">
                Copy
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {"Configure this URL in your Shopify Admin under Settings > Notifications > Webhooks for the "}
              <span className="font-mono font-medium">{"orders/paid"}</span>
              {" event."}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="webhook-secret">Webhook Secret</Label>
            <Input
              id="webhook-secret"
              type="password"
              defaultValue="whsec_xxxxxxxxxxxxxxxxxxxx"
              className="font-mono text-sm"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
