"use client"

import { useState, useEffect } from "react"
import { MainSbtSettingsCard } from "./main-sbt-settings-card"
import { LineAirdropSettingsCard } from "./line-airdrop-settings-card"
import { NotificationSettingsCard } from "./notification-settings-card"

export function SettingsForm() {
  const [templates, setTemplates] = useState<any[]>([])

  useEffect(() => {
    fetch("/api/templates")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setTemplates(data)
      })
      .catch(() => { })
  }, [])

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <MainSbtSettingsCard templates={templates} />
      <LineAirdropSettingsCard templates={templates} />
      <NotificationSettingsCard />
    </div>
  )
}
