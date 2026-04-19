const INVITE_URL = import.meta.env.VITE_BOT_INVITE_URL || null

const COMMANDS = [
  {
    category: 'Reporting',
    items: [
      {
        cmd: '/report',
        args: '',
        desc: 'Opens a popup form — fill in location, system, threat level, hostile handles, notes, and an optional bounty. No parameters to memorize.',
        tip: 'Attackers field format: Handle:Ship, Handle2:Ship2 — e.g. xX_Pirate_Xx:Cutlass Black, gr1m:Gladius',
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
        desc: 'Lists all active bounties sorted by payout. Shows claim status and short IDs for claiming.',
      },
      {
        cmd: '/claim',
        args: '<id>',
        desc: 'Register yourself as the hunter on a bounty. Use the short ID shown in /bounties. Your Discord display name is recorded.',
      },
      {
        cmd: '/cleared',
        args: '<id>',
        desc: 'Mark a bounty cleared after eliminating the threat. Only the player who claimed it can clear it. Announces the payout in the bounty channel.',
      },
    ],
  },
  {
    category: 'Intelligence',
    items: [
      {
        cmd: '/wanted',
        args: '<handle>',
        desc: 'Pulls a full rap sheet for a pirate handle — known systems, ships flown, threat profile, and every incident on record.',
      },
    ],
  },
  {
    category: 'Admin Setup',
    items: [
      {
        cmd: '/setup',
        args: '[alerts:#channel] [bounties:#channel]',
        desc: 'Configure which channels receive pirate alert embeds and bounty board posts. Requires Manage Server permission. Run with no arguments to see current config.',
        admin: true,
      },
    ],
  },
]

const STEPS = [
  {
    n: '1',
    title: 'Add the bot',
    body: 'Click the invite button below. Discord will ask you to pick a server and confirm permissions. The bot needs to send messages and embed links.',
  },
  {
    n: '2',
    title: 'Run /setup',
    body: 'An admin picks two channels using Discord\'s built-in channel picker — one for alert embeds, one for the bounty board. No channel IDs to copy.',
    code: '/setup alerts:#pirate-alerts bounties:#bounty-board',
  },
  {
    n: '3',
    title: 'Start reporting',
    body: 'Anyone in the server can run /report. A form pops up — fill in what you saw and hit Submit. The alert posts to your channel instantly.',
  },
]

function Step({ n, title, body, code }) {
  return (
    <div style={{
      display: 'flex', gap: 20,
      background: '#0d1117',
      border: '1px solid #1e2730',
      borderRadius: 10,
      padding: '20px 24px',
    }}>
      <div style={{
        flexShrink: 0,
        width: 36, height: 36,
        borderRadius: '50%',
        background: '#1a0a0a',
        border: '2px solid #dc2626',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, fontWeight: 900, color: '#ef4444',
      }}>
        {n}
      </div>
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#e6edf3', marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 13, color: '#8b949e', lineHeight: 1.6 }}>{body}</div>
        {code && (
          <code style={{
            display: 'inline-block', marginTop: 10,
            background: '#161b22', border: '1px solid #21262d',
            borderRadius: 6, padding: '6px 12px',
            fontSize: 12, color: '#c9d1d9', fontFamily: 'monospace',
          }}>
            {code}
          </code>
        )}
      </div>
    </div>
  )
}

function CommandCard({ cmd, args, desc, tip, admin }) {
  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid #1e2730',
      borderLeft: admin ? '3px solid #f59e0b' : '3px solid #dc2626',
      borderRadius: 8,
      padding: '14px 18px',
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <code style={{ fontSize: 14, fontWeight: 700, color: '#ef4444', fontFamily: 'monospace' }}>{cmd}</code>
        {args && (
          <code style={{ fontSize: 12, color: '#8b949e', fontFamily: 'monospace' }}>{args}</code>
        )}
        {admin && (
          <span style={{
            fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
            color: '#f59e0b', background: '#1c1400', border: '1px solid #f59e0b44',
            borderRadius: 4, padding: '1px 6px',
          }}>
            ADMIN
          </span>
        )}
      </div>
      <div style={{ fontSize: 13, color: '#8b949e', lineHeight: 1.6 }}>{desc}</div>
      {tip && (
        <div style={{
          marginTop: 10, fontSize: 12, color: '#6e7681',
          background: '#161b22', borderRadius: 6,
          padding: '8px 12px', fontFamily: 'monospace',
        }}>
          💡 {tip}
        </div>
      )}
    </div>
  )
}

export default function BotGuide() {
  return (
    <div style={{
      maxWidth: 780,
      margin: '0 auto',
      padding: 'clamp(24px, 4vw, 48px) clamp(16px, 3vw, 32px)',
      color: '#c9d1d9',
    }}>

      {/* Hero */}
      <div style={{
        textAlign: 'center',
        marginBottom: 52,
        padding: '40px 24px',
        background: '#0d1117',
        border: '1px solid #1e2730',
        borderRadius: 12,
      }}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>☠</div>
        <h1 style={{
          fontSize: 'clamp(22px, 4vw, 32px)',
          fontWeight: 900, color: '#ffffff',
          letterSpacing: '0.05em', textTransform: 'uppercase',
          margin: '0 0 10px',
        }}>
          PirateSpotter for Discord
        </h1>
        <p style={{
          fontSize: 15, color: '#8b949e', maxWidth: 520,
          margin: '0 auto 28px', lineHeight: 1.6,
        }}>
          Bring live pirate intel directly into your org's Discord server.
          File reports, manage bounties, and track wanted pirates — all from
          Discord slash commands.
        </p>
        {INVITE_URL ? (
          <a
            href={INVITE_URL}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-block',
              background: '#5865f2',
              color: '#fff',
              fontWeight: 700,
              fontSize: 14,
              borderRadius: 8,
              padding: '12px 32px',
              textDecoration: 'none',
              letterSpacing: '0.03em',
              transition: 'opacity 0.15s',
            }}
            onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
            onMouseOut={e => e.currentTarget.style.opacity = '1'}
          >
            + Add to Discord
          </a>
        ) : (
          <div style={{
            display: 'inline-block',
            background: '#161b22', border: '1px solid #21262d',
            borderRadius: 8, padding: '12px 28px',
            fontSize: 13, color: '#6e7681',
          }}>
            Contact your org admin for the invite link
          </div>
        )}
      </div>

      {/* How it works */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={sectionHead}>How to get started</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {STEPS.map(s => <Step key={s.n} {...s} />)}
        </div>
      </section>

      {/* Commands */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={sectionHead}>Commands</h2>
        {COMMANDS.map(group => (
          <div key={group.category} style={{ marginBottom: 32 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: '0.15em',
              textTransform: 'uppercase', color: '#484f58',
              marginBottom: 10,
            }}>
              {group.category}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {group.items.map(item => <CommandCard key={item.cmd} {...item} />)}
            </div>
          </div>
        ))}
      </section>

      {/* Report form guide */}
      <section style={{ marginBottom: 48 }}>
        <h2 style={sectionHead}>Filling out the /report form</h2>
        <div style={{
          background: '#0d1117', border: '1px solid #1e2730',
          borderRadius: 10, overflow: 'hidden',
        }}>
          {FORM_FIELDS.map((f, i) => (
            <div key={f.label} style={{
              display: 'flex', gap: 16,
              padding: '14px 20px',
              borderBottom: i < FORM_FIELDS.length - 1 ? '1px solid #161b22' : 'none',
            }}>
              <div style={{
                flexShrink: 0, width: 8, borderRadius: 4,
                background: f.required ? '#dc2626' : '#21262d',
                alignSelf: 'stretch', minHeight: 18,
              }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 3 }}>
                  {f.label}
                  {!f.required && <span style={{ fontSize: 11, color: '#484f58', marginLeft: 6 }}>optional</span>}
                </div>
                <div style={{ fontSize: 12, color: '#8b949e', lineHeight: 1.5 }}>{f.desc}</div>
                {f.example && (
                  <code style={{
                    display: 'inline-block', marginTop: 6,
                    fontSize: 11, color: '#6e7681', fontFamily: 'monospace',
                    background: '#161b22', borderRadius: 4, padding: '3px 8px',
                  }}>
                    e.g. {f.example}
                  </code>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Bounty flow */}
      <section>
        <h2 style={sectionHead}>Bounty board workflow</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {BOUNTY_STEPS.map((s, i) => (
            <div key={i} style={{
              display: 'flex', gap: 14, alignItems: 'flex-start',
              background: '#0d1117', border: '1px solid #1e2730',
              borderRadius: 8, padding: '14px 18px',
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{s.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#e6edf3', marginBottom: 3 }}>{s.title}</div>
                <div style={{ fontSize: 12, color: '#8b949e', lineHeight: 1.5 }}>{s.body}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  )
}

const sectionHead = {
  fontSize: 13, fontWeight: 700, letterSpacing: '0.1em',
  textTransform: 'uppercase', color: '#6e7681',
  marginBottom: 16, marginTop: 0,
  paddingBottom: 8, borderBottom: '1px solid #1e2730',
}

const FORM_FIELDS = [
  {
    label: 'Location',
    required: true,
    desc: 'Where you spotted the pirate. Be as specific as possible — station name, asteroid belt, orbit, comm array.',
    example: 'Grim HEX, Aaron Halo inner ring, CRU-L1 blind spot',
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
    desc: 'Comma-separated list of in-game handles with their ships. Format: Handle:Ship. Leave the ship blank if unknown.',
    example: 'xX_Pirate_Xx:Cutlass Black, gr1m:Gladius, Unknown_Pilot',
  },
  {
    label: 'Notes',
    required: false,
    desc: 'Anything else — tactics, org colors, number of ships, escape routes, how the encounter went.',
    example: 'Using Mantis to pull ships out of QT, then two Cutlasses move in',
  },
  {
    label: 'Bounty',
    required: false,
    desc: 'If you\'re offering a bounty, enter the aUEC amount then a pipe then the terms. This is an honor system — no escrow.',
    example: '500000 | Kill on sight, screenshot required, DM me in-game',
  },
]

const BOUNTY_STEPS = [
  {
    icon: '📋',
    title: 'A bounty is posted',
    body: 'When a report includes a bounty amount, PirateSpotter automatically posts a bounty card to your configured bounty channel with the short ID and terms.',
  },
  {
    icon: '🎯',
    title: 'A hunter claims it with /claim <id>',
    body: 'The short ID is shown on every bounty card. Running /claim registers your Discord display name as the active hunter. Only one hunter can claim per bounty.',
  },
  {
    icon: '💀',
    title: 'Hunter clears it with /cleared <id>',
    body: 'After eliminating the threat, the same hunter runs /cleared to mark it done. This triggers a payout announcement in the bounty channel. Payment happens in-game on the honor system.',
  },
  {
    icon: '📖',
    title: 'Check /bounties for open contracts',
    body: 'Run /bounties at any time to see all open and claimed-but-not-cleared bounties, sorted by payout amount. Filter by system with /bounties Pyro.',
  },
]
