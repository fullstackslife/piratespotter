const ACCENT = '#dc2626'
const DIM = '#8b949e'
const BORDER = '#1e2730'
const CARD_BG = '#0d1117'
const SURFACE = '#0a0d12'

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: 48 }}>
      <h2 style={{
        fontSize: 18, fontWeight: 700, color: '#fff',
        letterSpacing: '0.06em', textTransform: 'uppercase',
        borderBottom: `1px solid ${BORDER}`, paddingBottom: 12, marginBottom: 24,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

function Card({ icon, title, children, highlight }) {
  return (
    <div style={{
      background: CARD_BG,
      border: `1px solid ${highlight ? ACCENT : BORDER}`,
      borderRadius: 10,
      padding: '20px 24px',
      display: 'flex', gap: 16, alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: 24, flexShrink: 0, lineHeight: 1.3 }}>{icon}</span>
      <div>
        {title && <div style={{ fontWeight: 700, color: '#fff', marginBottom: 6, fontSize: 14 }}>{title}</div>}
        <div style={{ color: DIM, fontSize: 13, lineHeight: 1.65 }}>{children}</div>
      </div>
    </div>
  )
}

function Step({ n, title, children }) {
  return (
    <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: ACCENT, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900, fontSize: 15, flexShrink: 0,
      }}>
        {n}
      </div>
      <div style={{ paddingTop: 6 }}>
        <div style={{ fontWeight: 700, color: '#fff', marginBottom: 4, fontSize: 14 }}>{title}</div>
        <div style={{ color: DIM, fontSize: 13, lineHeight: 1.65 }}>{children}</div>
      </div>
    </div>
  )
}

function Divider() {
  return <div style={{ width: 2, height: 28, background: BORDER, marginLeft: 17 }} />
}

function Callout({ icon = '⚠', color = '#f59e0b', children }) {
  return (
    <div style={{
      background: SURFACE,
      border: `1px solid ${color}33`,
      borderLeft: `3px solid ${color}`,
      borderRadius: 8,
      padding: '14px 18px',
      display: 'flex', gap: 12, alignItems: 'flex-start',
      fontSize: 13, color: DIM, lineHeight: 1.65,
    }}>
      <span style={{ color, flexShrink: 0, fontSize: 16, lineHeight: 1.4 }}>{icon}</span>
      <span>{children}</span>
    </div>
  )
}

function FAQItem({ question, answer, last }) {
  return (
    <div style={{
      background: CARD_BG,
      border: `1px solid ${BORDER}`,
      borderRadius: 8,
      padding: '18px 22px',
      marginBottom: last ? 0 : 8,
    }}>
      <div style={{ fontWeight: 700, color: '#fff', fontSize: 14, marginBottom: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <span style={{ color: ACCENT, flexShrink: 0 }}>Q</span>
        {question}
      </div>
      <div style={{ color: DIM, fontSize: 13, lineHeight: 1.7, paddingLeft: 20 }}>{answer}</div>
    </div>
  )
}

export default function HuntingGuide() {
  return (
    <div style={{
      maxWidth: 820,
      margin: '0 auto',
      padding: 'clamp(24px, 4vw, 56px) clamp(16px, 3vw, 48px)',
      fontFamily: 'inherit',
    }}>

      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, #12070a 0%, #0d1117 60%, #07090f 100%)`,
        border: `1px solid ${BORDER}`,
        borderLeft: `4px solid ${ACCENT}`,
        borderRadius: 12,
        padding: 'clamp(24px, 3vw, 40px)',
        marginBottom: 48,
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>☠</div>
        <h1 style={{ fontSize: 'clamp(22px, 3.5vw, 32px)', fontWeight: 900, color: '#fff', margin: '0 0 12px', lineHeight: 1.2 }}>
          Pirate Hunter's Guide
        </h1>
        <p style={{ color: DIM, fontSize: 15, lineHeight: 1.7, margin: 0, maxWidth: 600 }}>
          PirateSpotters is a community-driven intel platform for Star Citizen. Citizens report
          pirate activity in real time — you use that intel to find them, server-hop into their
          shard, and bring them down.
        </p>
      </div>

      {/* How the site works */}
      <Section title="☰  How PirateSpotters Works">
        <div style={{ display: 'grid', gap: 14 }}>
          <Card icon="📡" title="Live Reports">
            Victims and witnesses file pirate sightings through the site or the Discord bot.
            Each report includes the system, location, threat level, pirate type, hostile
            player handles, ship types, and optional bounty.
          </Card>
          <Card icon="🗺" title="Star Map">
            The <strong style={{ color: '#fff' }}>Star Map</strong> tab plots active incidents
            across Stanton, Pyro, and Nyx so you can see at a glance where piracy is hot.
            Click a system node to drill into its locations.
          </Card>
          <Card icon="💰" title="Bounty Board">
            Reporters can attach an aUEC bounty to a sighting. Any hunter can{' '}
            <strong style={{ color: '#fff' }}>/claim</strong> a bounty via the Discord bot,
            then <strong style={{ color: '#fff' }}>/cleared</strong> it once the threat is
            neutralised. Bounties are honour-system — settlements happen in-game.
          </Card>
          <Card icon="🤖" title="Discord Bot">
            The bot mirrors every report into your server's alert channel in real time.
            You can also file reports, check intel, and manage bounties entirely through
            Discord slash commands without opening the site.
          </Card>
        </div>
      </Section>

      {/* Pirate hunting basics */}
      <Section title="🎯  Pirate Hunting Basics">
        <div style={{ display: 'grid', gap: 14, marginBottom: 24 }}>
          <Card icon="🔍" title="Find a target">
            Browse the Live Feed or Star Map for recent, high-threat reports. Look for
            incidents with named attacker handles — those are the easiest to track down
            since you can verify their org and ship loadout on the RSI website.
          </Card>
          <Card icon="📍" title="Confirm the location">
            Pirates often linger at or near the spot where they made a kill — they may
            be looting, camping the spawn, or waiting for another victim. High-traffic
            chokepoints (jump points, trade routes, stations near derelict sites) are
            common hunting grounds.
          </Card>
          <Card icon="⚔" title="Engage and collect" highlight>
            Once you are in the same shard (see Server Hopping below), find the pirates,
            engage, and destroy or incapacitate them. Screenshot your kill for proof if
            a bounty is attached, then use <strong style={{ color: '#fff' }}>/cleared</strong> in
            Discord to mark the bounty paid out.
          </Card>
        </div>
        <Callout icon="💡" color="#22c55e">
          New to bounty hunting? Start with <strong style={{ color: '#e5e7eb' }}>low or medium
          threat</strong> solo targets in Stanton before taking on organised pirate groups in
          Pyro. Check the attacker's known ships in the report — a Cutlass Black needs a
          different approach than a Hammerhead.
        </Callout>
      </Section>

      {/* Server hopping */}
      <Section title="🔄  Server Hopping — Get Into the Pirate's Shard">
        <p style={{ color: DIM, fontSize: 13, lineHeight: 1.7, marginTop: 0, marginBottom: 24 }}>
          Star Citizen splits its population across thousands of simultaneous game
          instances called <strong style={{ color: '#e5e7eb' }}>shards</strong>. When a victim
          files a report they are in a specific shard — and so are the pirates. You need to
          land in that same shard to engage them. The technique to do this is called{' '}
          <strong style={{ color: '#e5e7eb' }}>server hopping</strong>.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 24 }}>
          <Step n={1} title="Contact the victim">
            Reach out to the reporting player (their handle is on the report) and ask them
            to stay online in the same shard. You need them as an active party leader.
          </Step>
          <Divider />
          <Step n={2} title="Form a party and hand over leader">
            Have the victim send you a party invite. Once all hunters have accepted,{' '}
            <strong style={{ color: '#fff' }}>make the victim the party leader</strong>. This
            is the critical step — their leader status is what ties the group to their shard.
          </Step>
          <Divider />
          <Step n={3} title="Hunters log out completely">
            Every hunter in the party must fully log out to the{' '}
            <strong style={{ color: '#fff' }}>main menu</strong> — not just to the hangar.
            A full logout drops you off the current server so you are ready to be placed
            fresh.
          </Step>
          <Divider />
          <Step n={4} title="Hunters log back in">
            Log back into the game. Because you are in a party and the leader is still
            active in their shard, the matchmaking system will prioritise placing you into
            the <strong style={{ color: '#fff' }}>same shard as the leader</strong>. When
            the loading screen completes you should spawn in the same instance as the victim.
          </Step>
          <Divider />
          <Step n={5} title="Verify the shard match">
            Confirm you are on the same shard by flying to the victim's position or asking
            them to fire a flare. If you can see each other, you are in. If not, repeat
            the logout cycle — it occasionally takes two attempts.
          </Step>
          <Divider />
          <Step n={6} title="Move to the incident location">
            QT to the system location listed in the report. Pirates typically remain in
            the area of their kill — approach carefully, scan for ships, and engage.
          </Step>
        </div>

        <Callout icon="⚠" color="#f59e0b">
          Server hopping is more reliable when the victim is{' '}
          <strong style={{ color: '#e5e7eb' }}>not in quantum travel</strong> when hunters
          log back in. Ask them to hold position at a station or on the ground while the
          party reloads.
        </Callout>
      </Section>

      {/* Quick reference */}
      <Section title="📋  Quick Reference">
        <div style={{
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 10,
          overflow: 'hidden',
          fontSize: 13,
        }}>
          {[
            ['Victim files a report',       'Site / Discord bot / /report command'],
            ['Find the report',             'Live Feed, Star Map, or /intel in Discord'],
            ['Contact the victim',          'RSI handle shown on each report'],
            ['Party up + victim leads',     'Standard SC party menu → transfer leader'],
            ['Hunters log out fully',       'Main menu — not hangar, not bed logout'],
            ['Hunters log back in',         'Game places you in leader\'s shard'],
            ['Confirm same shard',          'Fly to victim, verify visual contact'],
            ['Engage pirates',              'QT to the incident location, scan, fight'],
            ['Claim bounty (if any)',       '/claim <id> in Discord'],
            ['Mark bounty cleared',         '/cleared <id> in Discord after kill'],
          ].map(([action, detail], i) => (
            <div key={i} style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              padding: '11px 18px',
              borderBottom: i < 9 ? `1px solid ${BORDER}` : 'none',
              background: i % 2 === 0 ? 'transparent' : '#080b10',
            }}>
              <span style={{ color: '#fff', minWidth: 220, flexShrink: 0 }}>{action}</span>
              <span style={{ color: DIM }}>{detail}</span>
            </div>
          ))}
        </div>
      </Section>

      {/* FAQ */}
      <Section title="❓  Frequently Asked Questions">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            {
              q: 'How do I know if the pirate is actually on my shard?',
              a: `You can't — Star Citizen doesn't expose shard IDs or population lists to players. The game can spin up hundreds of simultaneous shards based on server load, and there is currently no in-game tool or third-party method to check which shard a specific player is on. The server-hop technique (party + leader logout) is the only reliable way to land in the same instance as someone you know is already online. If you arrive at the location and the pirates are gone, they may have logged off, moved on, or you ended up on a different shard — in which case repeat the cycle with a fresh victim lead.`,
            },
            {
              q: 'What if the victim has already logged off by the time I respond?',
              a: `Without an active party leader in the target shard there is no reliable way to server-hop into it. Your best options: head to the reported location anyway — pirate orgs often stay in an area for extended sessions — or watch the Live Feed for follow-up reports from the same location. A second victim appearing nearby is a strong signal the pirates are still active.`,
            },
            {
              q: 'Does server hopping always work?',
              a: `Not 100%. The matchmaking system prioritises putting party members together but it is not guaranteed, especially during high-population events or when the leader's shard is nearly full. If the first attempt fails, the victim stays put and hunters log out and back in again. Most groups land on the same shard within one or two attempts.`,
            },
            {
              q: 'Can the pirate see me server-hopping in?',
              a: `No. From their perspective you simply appear in the shard — there is no notification or indicator that someone joined their instance specifically to hunt them.`,
            },
            {
              q: 'What is the difference between a shard and a server?',
              a: `Informally the terms are used interchangeably by the community. Technically a shard is a full simulation instance — it has its own copy of every planet, station, and NPC. Multiple shards run simultaneously on CIG's infrastructure. When you log in you are placed into one shard; the pirates are in another unless you deliberately sync via party hopping.`,
            },
            {
              q: 'Do I need to be in the same system as the victim to hop shards?',
              a: `No. You can be anywhere in the universe when you log out. What matters is that you are in the same party and the victim is the active leader. When you log back in the game places you in the leader's shard regardless of where in the 'verse you both are.`,
            },
            {
              q: 'Can I track a pirate across multiple shards?',
              a: `Not directly — each shard is independent. However, reports on PirateSpotters are persistent. If the same pirate handle appears across multiple reports you can build a picture of their preferred locations and times, which makes it easier to intercept them next time they are active.`,
            },
          ].map(({ q, a }, i, arr) => (
            <FAQItem key={i} question={q} answer={a} last={i === arr.length - 1} />
          ))}
        </div>
      </Section>

    </div>
  )
}
