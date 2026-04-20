import { useState, useEffect } from 'react'
import { apiUrl } from '../api'

const COMMANDS = [
  {
    category: 'Reporting',
    items: [
      {
        cmd: '/report',
        args: '',
        desc: 'Opens a Discord form — fill in location, system, threat level, hostile handles, ship type, notes, and an optional bounty. No parameters to memorize.',
        tip: 'Attackers field: comma-separated handles with ships — e.g. xX_Pirate_Xx:Cutlass Black, gr1m:Gladius',
      },
      {
        cmd: '/intel',
        args: '[system]',
        desc: 'Shows the 5 most recent pirate reports. Optionally filter by Stanton, Pyro, or Nyx.',
      },
    ],
  },
  {
    category: 'Bounty Board',
    items: [
      {
        cmd: '/bounties',
        args: '[system]',
        desc: 'Lists all active bounties sorted by payout. Shows claim status and short IDs.',
      },
      {
        cmd: '/claim',
        args: '<id>',
        desc: 'Register yourself as the hunter on a bounty. Use the short ID shown in /bounties.',
      },
      {
        cmd: '/cleared',
        args: '<id>',
        desc: 'Mark a bounty cleared after eliminating the threat. Announces the payout in the bounty channel.',
      },
    ],
  },
  {
    category: 'Intelligence',
    items: [
      {
        cmd: '/wanted',
        args: '<handle>',
        desc: "Pull a pirate's full rap sheet — known systems, ships flown, threat profile, and every incident on record.",
      },
    ],
  },
  {
    category: 'Server Setup',
    items: [
      {
        cmd: '/setup',
        args: '[alerts:#channel] [bounties:#channel]',
        desc: 'Configure which channels receive pirate alert embeds and bounty board posts. Run with no arguments to see current config.',
        admin: true,
      },
    ],
  },
]

const STEPS = [
  {
    n: '1',
    title: 'Add the bot to your server',
    body: "Click the \"Add to Discord\" button at the top of this page. You'll be asked to choose a server and confirm permissions. The bot needs to send messages and embed links — nothing else.",
  },
  {
    n: '2',
    title: 'Configure your channels',
    body: 'Run /setup as a server admin. Pick a channel for pirate alert embeds and a separate channel for the bounty board. Discord\'s built-in channel picker handles everything — no channel IDs to copy.',
    code: '/setup alerts:#pirate-alerts bounties:#bounty-board',
  },
  {
    n: '3',
    title: 'Start reporting pirates',
    body: 'Anyone can run /report. A form pops up right inside Discord. Fill in the location, threat level, hostile handles, and ship type — then hit Submit. The alert posts instantly to your configured channel.',
  },
  {
    n: '4',
    title: 'Auto-broadcast from the web',
    body: 'Reports filed on piratespotters.space are automatically broadcast to every server with the bot installed within 60 seconds. No manual action needed.',
  },
]

const FORM_FIELDS = [
  {
    label: 'Location',
    required: true,
    desc: 'Where you spotted the pirate. Type the name and an autocomplete list appears. Only known Star Citizen locations are accepted — be as specific as possible.',
    example: 'Grim HEX, Aaron Halo inner ring, CRU-L1 Ambitious Dream Station',
  },
  {
    label: 'System | Threat | Type',
    required: true,
    desc: 'Three values separated by pipes. System: Stanton / Pyro / Nyx. Threat: low / medium / high. Type: ambush / blockade / patrol / org / griefer / other.',
    example: 'Pyro | high | blockade',
  },
  {
    label: 'Attackers',
    required: false,
    desc: 'Comma-separated pirate handles with their ship type. Format: Handle:Ship. Leave the ship blank if unknown. Max 12 entries.',
    example: 'xX_Pirate_Xx:Cutlass Black, gr1m:Gladius, Silent_Wolf',
  },
  {
    label: 'Notes',
    required: false,
    desc: 'Describe the encounter — tactics, org colors, number of ships, escape routes, interdiction setup. Max 500 characters. Keep it factual.',
    example: 'Using Mantis to pull ships out of QT near CRU-L1, then two Cutlasses move in from the blind side',
  },
  {
    label: 'Bounty',
    required: false,
    desc: "Offer aUEC to encourage hunters. Enter the amount then a pipe then the terms. Honor system — no escrow. Payment arranged in-game.",
    example: '500000 | Kill on sight, screenshot proof required, DM reporter in-game',
  },
]

const BOUNTY_STEPS = [
  {
    icon: '📋',
    title: 'Reporter posts a bounty',
    body: 'When a report includes a bounty amount, PirateSpotter automatically posts a bounty card to your configured channel with the payout and short ID.',
  },
  {
    icon: '🎯',
    title: 'Hunter claims it — /claim <id>',
    body: "The short ID appears on every bounty card. Running /claim registers your Discord display name as the active hunter. One hunter per bounty.",
  },
  {
    icon: '💀',
    title: 'Hunter clears it — /cleared <id>',
    body: 'After eliminating the threat, the same hunter runs /cleared to mark it done. A payout announcement fires in the bounty channel. Payment happens in-game on the honor system.',
  },
  {
    icon: '📖',
    title: 'Browse open contracts — /bounties',
    body: 'Run /bounties at any time to see all open and claimed-but-not-cleared bounties, sorted by payout. Filter by system with /bounties Pyro.',
  },
]

const FEATURES = [
  { icon: '📡', text: 'Live pirate alerts in your channel — auto-broadcast within 60 s' },
  { icon: '💰', text: 'Bounty board with claim / clear workflow' },
  { icon: '🔍', text: '/wanted — pirate rap sheets with ship history' },
  { icon: '📊', text: '/intel — recent reports per system, fast' },
  { icon: '🛡', text: 'Org-level visibility across Stanton, Pyro & Nyx' },
]

// ── Subcomponents ─────────────────────────────────────────────────────────────

function InviteButton({ url, loading }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 10,
    background: '#5865f2', color: '#fff',
    fontWeight: 700, fontSize: 15,
    borderRadius: 10, padding: '14px 36px',
    textDecoration: 'none',
    letterSpacing: '0.02em',
    border: 'none', cursor: 'pointer',
    transition: 'opacity 0.15s, transform 0.1s',
    boxShadow: '0 4px 24px rgba(88,101,242,0.35)',
  }

  if (loading) {
    return <div style={{ ...base, background: '#21262d', color: '#484f58', cursor: 'default', boxShadow: 'none' }}>Loading…</div>
  }

  if (!url) {
    return (
      <div style={{ ...base, background: '#161b22', border: '1px solid #21262d', color: '#6e7681', cursor: 'default', boxShadow: 'none', fontSize: 13 }}>
        Bot invite not configured — contact the server owner
      </div>
    )
  }

  return (
    <a href={url} target="_blank" rel="noreferrer" style={base}
      onMouseOver={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseOut={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.033.054a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
      </svg>
      Add to Discord
    </a>
  )
}

function Step({ n, title, body, code }) {
  return (
    <div style={{ display: 'flex', gap: 20, background: '#0d1117', border: '1px solid #1e2730', borderRadius: 10, padding: '20px 24px' }}>
      <div style={{
        flexShrink: 0, width: 36, height: 36, borderRadius: '50%',
        background: '#1a0808', border: '2px solid #dc2626',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, fontWeight: 900, color: '#ef4444',
      }}>{n}</div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#e6edf3', marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#8b949e', lineHeight: 1.6 }}>{body}</div>
        {code && (
          <code style={{ display: 'inline-block', marginTop: 10, background: '#161b22', border: '1px solid #21262d', borderRadius: 6, padding: '6px 12px', fontSize: 12, color: '#c9d1d9', fontFamily: 'monospace' }}>
            {code}
          </code>
        )}
      </div>
    </div>
  )
}

function CommandCard({ cmd, args, desc, tip, admin }) {
  return (
    <div style={{ background: '#0d1117', border: '1px solid #1e2730', borderLeft: admin ? '3px solid #f59e0b' : '3px solid #dc2626', borderRadius: 8, padding: '14px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <code style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', fontFamily: 'monospace' }}>{cmd}</code>
        {args && <code style={{ fontSize: 12, color: '#8b949e', fontFamily: 'monospace' }}>{args}</code>}
        {admin && (
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: '#f59e0b', background: '#1c1400', border: '1px solid #f59e0b44', borderRadius: 4, padding: '1px 6px' }}>
            ADMIN
          </span>
        )}
      </div>
      <div style={{ fontSize: 13, color: '#8b949e', lineHeight: 1.6 }}>{desc}</div>
      {tip && (
        <div style={{ marginTop: 10, fontSize: 12, color: '#6e7681', background: '#161b22', borderRadius: 6, padding: '8px 12px', fontFamily: 'monospace' }}>
          💡 {tip}
        </div>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function BotGuide() {
  const [inviteUrl, setInviteUrl] = useState(null)
  const [loadingUrl, setLoadingUrl] = useState(true)

  useEffect(() => {
    fetch(apiUrl('/api/config'))
      .then(r => r.json())
      .then(j => { setInviteUrl(j.bot_invite_url || null) })
      .catch(() => {})
      .finally(() => setLoadingUrl(false))
  }, [])

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: 'clamp(24px,4vw,48px) clamp(16px,3vw,32px)', color: '#c9d1d9' }}>

      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 52, padding: '44px 28px', background: '#0d1117', border: '1px solid #1e2730', borderRadius: 14 }}>
        <div style={{ fontSize: 48, marginBottom: 14 }}>☠</div>
        <h1 style={{ fontSize: 'clamp(22px,4vw,32px)', fontWeight: 900, color: '#fff', letterSpacing: '0.05em', textTransform: 'uppercase', margin: '0 0 12px' }}>
          PirateSpotter for Discord
        </h1>
        <p style={{ fontSize: 15, color: '#8b949e', maxWidth: 520, margin: '0 auto 32px', lineHeight: 1.65 }}>
          Bring live pirate intel directly into your org's Discord server.
          File reports, track bounties, and look up wanted pirates — all with
          slash commands.
        </p>

        <InviteButton url={inviteUrl} loading={loadingUrl} />

        {/* Feature pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 28 }}>
          {FEATURES.map(f => (
            <div key={f.text} style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 20, padding: '6px 14px', fontSize: 12, color: '#8b949e', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span>{f.icon}</span><span>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* How to install */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={sHead}>Installation</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {STEPS.map(s => <Step key={s.n} {...s} />)}
        </div>

        {/* Inline invite button repeated below the steps */}
        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <InviteButton url={inviteUrl} loading={loadingUrl} />
        </div>
      </section>

      {/* Commands */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={sHead}>Commands</h2>
        {COMMANDS.map(group => (
          <div key={group.category} style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#484f58', marginBottom: 10 }}>
              {group.category}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {group.items.map(item => <CommandCard key={item.cmd} {...item} />)}
            </div>
          </div>
        ))}
      </section>

      {/* /report form guide */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={sHead}>Filling out the /report form</h2>
        <p style={{ fontSize: 13, color: '#6e7681', marginBottom: 16, lineHeight: 1.6 }}>
          A note on cooldowns: each Discord account can submit one report every 5 minutes to prevent spam. The bot bypasses this limit for automated / org tooling using a shared secret.
        </p>
        <div style={{ background: '#0d1117', border: '1px solid #1e2730', borderRadius: 10, overflow: 'hidden' }}>
          {FORM_FIELDS.map((f, i) => (
            <div key={f.label} style={{ display: 'flex', gap: 16, padding: '14px 20px', borderBottom: i < FORM_FIELDS.length - 1 ? '1px solid #161b22' : 'none' }}>
              <div style={{ flexShrink: 0, width: 8, borderRadius: 4, background: f.required ? '#dc2626' : '#21262d', alignSelf: 'stretch', minHeight: 18 }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 3 }}>
                  {f.label}
                  {!f.required && <span style={{ fontSize: 11, color: '#484f58', marginLeft: 6 }}>optional</span>}
                </div>
                <div style={{ fontSize: 12, color: '#8b949e', lineHeight: 1.5 }}>{f.desc}</div>
                {f.example && (
                  <code style={{ display: 'inline-block', marginTop: 6, fontSize: 11, color: '#6e7681', fontFamily: 'monospace', background: '#161b22', borderRadius: 4, padding: '3px 8px' }}>
                    e.g. {f.example}
                  </code>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bounty flow */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={sHead}>Bounty board workflow</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {BOUNTY_STEPS.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: '#0d1117', border: '1px solid #1e2730', borderRadius: 8, padding: '14px 18px' }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 3 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: '#8b949e', lineHeight: 1.5 }}>{s.body}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Permissions note */}
      <section>
        <h2 style={sHead}>Permissions the bot requests</h2>
        <div style={{ background: '#0d1117', border: '1px solid #1e2730', borderRadius: 10, padding: '20px 24px' }}>
          {[
            ['View Channels', 'Needed to see the channels you configure for alerts and bounties.'],
            ['Send Messages', 'Posts pirate alert and bounty embeds to your configured channels.'],
            ['Embed Links', 'Required for rich embed cards with threat levels and details.'],
            ['Attach Files', 'Reserved for future screenshot/evidence attachments.'],
            ['Read Message History', 'Allows the bot to find previous bounty posts for claim/clear updates.'],
          ].map(([perm, reason]) => (
            <div key={perm} style={{ display: 'flex', gap: 12, paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid #161b22' }}>
              <span style={{ color: '#4ade80', fontWeight: 700, fontSize: 13, minWidth: 160, flexShrink: 0 }}>✓ {perm}</span>
              <span style={{ fontSize: 13, color: '#8b949e' }}>{reason}</span>
            </div>
          ))}
          <p style={{ fontSize: 12, color: '#484f58', marginTop: 4, marginBottom: 0 }}>
            The bot does not request administrator, kick/ban, manage server, or any elevated permissions.
          </p>
        </div>
      </section>

    </div>
  )
}

const sHead = {
  fontSize: 13, fontWeight: 700, letterSpacing: '0.1em',
  textTransform: 'uppercase', color: '#6e7681',
  marginBottom: 16, marginTop: 0,
  paddingBottom: 8, borderBottom: '1px solid #1e2730',
}
