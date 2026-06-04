"use client";

import {
  ModelCatalogItem,
  OperationsDashboard,
  ProviderDescriptor
} from "@image-platform/shared";
import {
  Activity,
  KeyRound,
  RefreshCw,
  ShieldCheck,
  WalletCards
} from "lucide-react";
import { useState } from "react";
import { GenerationConsole } from "./generation-console";

interface WorkbenchProps {
  apiBaseUrl: string;
  providers: ProviderDescriptor[];
  catalog: ModelCatalogItem[];
  dashboard: OperationsDashboard;
}

export function Workbench({
  apiBaseUrl,
  providers,
  catalog,
  dashboard
}: WorkbenchProps) {
  const [apiKey, setApiKey] = useState("");
  const [latestKey, setLatestKey] = useState("");
  const [snapshot, setSnapshot] = useState(dashboard);
  const quotaPercent =
    snapshot.project.monthlyImageQuota > 0
      ? Math.round(
          (snapshot.project.usedImages / snapshot.project.monthlyImageQuota) * 100
        )
      : 0;

  async function refreshDashboard() {
    const response = await fetch(`${apiBaseUrl}/operations/dashboard`, {
      cache: "no-store"
    });
    if (response.ok) {
      setSnapshot((await response.json()) as OperationsDashboard);
    }
  }

  async function createApiKey() {
    const response = await fetch(`${apiBaseUrl}/operations/api-keys`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Console Key"
      })
    });

    if (!response.ok) {
      return;
    }

    const created = (await response.json()) as {
      apiKey: string;
      descriptor: OperationsDashboard["apiKeys"][number];
    };
    setLatestKey(created.apiKey);
    setApiKey(created.apiKey);
    await refreshDashboard();
  }

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brandMark">IP</span>
          <div>
            <strong>Image Platform</strong>
            <small>{snapshot.project.name}</small>
          </div>
        </div>
        <nav className="navList" aria-label="Main">
          <a className="active" href="#generate">
            <Activity aria-hidden="true" size={17} />
            Generate
          </a>
          <a href="#usage">
            <WalletCards aria-hidden="true" size={17} />
            Usage
          </a>
          <a href="#keys">
            <KeyRound aria-hidden="true" size={17} />
            API Keys
          </a>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>Generation Console</h1>
            <p>{snapshot.project.ownerEmail}</p>
          </div>
          <div className="topbarActions">
            <button className="ghostButton" onClick={refreshDashboard} type="button">
              <RefreshCw aria-hidden="true" size={17} />
              Refresh
            </button>
            <button className="primaryButton" onClick={createApiKey} type="button">
              <KeyRound aria-hidden="true" size={17} />
              New Key
            </button>
          </div>
        </header>

        <section className="metricsRow">
          <div className="metric">
            <span>Quota Used</span>
            <strong>{quotaPercent}%</strong>
            <div className="meter">
              <i style={{ width: `${Math.min(quotaPercent, 100)}%` }} />
            </div>
          </div>
          <div className="metric">
            <span>Remaining</span>
            <strong>{snapshot.project.remainingImages}</strong>
            <small>images this month</small>
          </div>
          <div className="metric">
            <span>Providers</span>
            <strong>{providers.filter((provider) => provider.configured).length}</strong>
            <small>{providers.length} connected slots</small>
          </div>
          <div className="metric">
            <span>Recent Spend</span>
            <strong>
              $
              {(
                snapshot.usage.reduce((total, entry) => total + entry.costCents, 0) / 100
              ).toFixed(2)}
            </strong>
            <small>latest ledger rows</small>
          </div>
        </section>

        <div id="generate" className="mainGrid">
          <GenerationConsole
            apiBaseUrl={apiBaseUrl}
            apiKey={apiKey}
            catalog={catalog}
            onTaskFinished={refreshDashboard}
            providers={providers}
          />

          <aside className="rightRail">
            <section id="keys" className="panel">
              <div className="panelTitle">
                <h3>API Key</h3>
                <ShieldCheck aria-hidden="true" size={18} />
              </div>
              <input
                placeholder="Optional x-api-key"
                type="password"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
              />
              {latestKey ? <code className="keyReveal">{latestKey}</code> : null}
              <div className="tableList">
                {snapshot.apiKeys.map((key) => (
                  <div key={key.id}>
                    <span>{key.name}</span>
                    <strong>{key.prefix}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel">
              <div className="panelTitle">
                <h3>Model Prices</h3>
                <WalletCards aria-hidden="true" size={18} />
              </div>
              <div className="tableList">
                {snapshot.prices.map((price) => (
                  <div key={`${price.provider}-${price.model}`}>
                    <span>{price.model}</span>
                    <strong>${(price.pricePerImageCents / 100).toFixed(2)}</strong>
                  </div>
                ))}
              </div>
            </section>

            <section id="usage" className="panel">
              <div className="panelTitle">
                <h3>Usage Ledger</h3>
                <Activity aria-hidden="true" size={18} />
              </div>
              <div className="tableList">
                {snapshot.usage.length === 0 ? (
                  <div>
                    <span>No usage yet</span>
                    <strong>$0.00</strong>
                  </div>
                ) : (
                  snapshot.usage.map((entry) => (
                    <div key={entry.id}>
                      <span>{entry.model}</span>
                      <strong>${(entry.costCents / 100).toFixed(2)}</strong>
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

