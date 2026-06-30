/**
 * api/social-hook.js — Vercel Serverless Function
 *
 * Receives automation triggers and dispatches content to social platforms.
 * Called by: n8n, Make.com, Zapier, or a cron scheduler.
 *
 * POST /api/social-hook
 * Headers: X-T42-Signature: <HMAC-SHA256 of body with SOCIAL_HOOK_SECRET>
 *
 * Plug-in points for AI video (ElevenLabs) and auto-posting tools are
 * clearly marked with  ← PLUG IN HERE  comments.
 */

const crypto = require('crypto');

// ── Platform config ────────────────────────────────────────────────────────

const PLATFORMS = {
  facebook:  { enabled: !!process.env.FACEBOOK_PAGE_TOKEN,   label: 'Facebook'  },
  instagram: { enabled: !!process.env.INSTAGRAM_ACCESS_TOKEN, label: 'Instagram' },
  tiktok:    { enabled: !!process.env.TIKTOK_ACCESS_TOKEN,    label: 'TikTok'    },
  pinterest: { enabled: !!process.env.PINTEREST_ACCESS_TOKEN, label: 'Pinterest' },
  linkedin:  { enabled: !!process.env.LINKEDIN_ACCESS_TOKEN,  label: 'LinkedIn'  },
};

// ── Content templates ──────────────────────────────────────────────────────

/**
 * Returns platform-optimised copy for a given trigger type.
 * AI video tool (ElevenLabs) should inject its video_url before dispatch.
 */
function buildContent(trigger, data = {}) {
  const templates = {
    daily_inspiration: {
      facebook:  `✨ Every great evening begins with a single intention.\n\nTable for Two arranges the rest — Lyft, OpenTable, even flowers.\n\nNo swiping. No ghosting. Just a commitment to show up.\n\n👉 Request your introduction today. Link in bio.\n\n#TableForTwo #Dating #LuxuryDating #PremiumMatchmaking`,
      instagram: `No swiping. No messaging.\nJust one curated introduction — and an evening worth remembering. 🥂\n\n#TableForTwo #IntentionalDating #LuxuryLifestyle #DateNight #PremiumExperience`,
      tiktok:    `Did you know: most people spend 3+ months messaging someone before meeting? We skip all that. $50 hold. Both parties commit. Venue revealed. You show up. ✨ #TableForTwo #DatingApp #LuxuryDating #NoSwiping`,
      pinterest: `The art of the curated introduction | Table for Two | Premium Matchmaking for Adults | No Swiping Required`,
      linkedin:  `The cost of a bad date isn't money — it's time.\n\nTable for Two places a mutual $50 commitment hold before revealing the venue. Both parties either show up, or forfeit.\n\nWe're building accountability into romance.\n\n#Innovation #DatingTech #FutureOfDating #Entrepreneurship`,
    },
    new_city_launch: {
      facebook:  `📍 Table for Two is now accepting members in ${data.city || 'your city'}.\n\nCurated introductions. Fully arranged evenings. No swiping.\n\nRequest your invitation today. Spots are limited.\n\n#TableForTwo #${(data.city || 'NewCity').replace(/\s/g, '')} #Dating`,
      instagram: `📍 Now in ${data.city || 'your city'}.\n\nYour next great evening is one intention away. ✨\n\n#TableForTwo #${(data.city || 'NewCity').replace(/\s/g, '')}Dating`,
      tiktok:    `We just launched in ${data.city || 'a new city'} 🎉 If you're tired of swiping and ready for something real — this is for you. #TableForTwo #NewLaunch`,
      pinterest: `Table for Two | Now in ${data.city || 'New City'} | Curated Date Experiences | Premium Matchmaking`,
      linkedin:  `Announcing our expansion to ${data.city || 'a new market'}.\n\nTable for Two is an intent-first matchmaking service for adults who value their time and the quality of their connections.\n\n#TableForTwo #Expansion #DatingInnovation`,
    },
    success_story: {
      facebook:  `"${data.quote || 'For the first time in years, I felt seen — not sorted.'}" — ${data.name || 'Margaret, 58'}\n\nStories like this are why we built Table for Two.\n\n#TableForTwo #MemberStory #Dating`,
      instagram: `"${data.quote || 'No games. No small talk. Just a wonderful evening.'}" 🥂\n\n— ${data.name || 'Richard, 64'}\n\n#TableForTwo #MemberLove #LuxuryDating`,
      tiktok:    `Real member story ✨ "${data.quote || 'Both of us showed up. It was a real date.'}" — This is what happens when you commit first. #TableForTwo #DatingSuccess`,
      pinterest: `Member Story | Table for Two | "${data.quote || 'An evening I will never forget.'}"`,
      linkedin:  `Member testimonial:\n\n"${data.quote || 'The commitment model changed everything. Both of us showed up.'}" — ${data.name || 'A Table for Two member'}\n\n#TestimonialTuesday #TableForTwo`,
    },
  };
  return templates[trigger] || templates.daily_inspiration;
}

// ── HMAC signature verification ────────────────────────────────────────────

function verifySignature(body, signature) {
  if (!process.env.SOCIAL_HOOK_SECRET) return true; // Skip in dev
  const expected = crypto
    .createHmac('sha256', process.env.SOCIAL_HOOK_SECRET)
    .update(typeof body === 'string' ? body : JSON.stringify(body))
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature || '', 'hex'),
    Buffer.from(expected, 'hex')
  );
}

// ── Platform dispatchers ───────────────────────────────────────────────────

async function postToFacebook(text, mediaUrl) {
  // ← PLUG IN HERE: replace with Facebook Graph API call
  // POST https://graph.facebook.com/{page-id}/feed
  //   ?message=text&access_token=FACEBOOK_PAGE_TOKEN
  console.log('[Facebook] Would post:', text.slice(0, 60) + '...');
  return { platform: 'facebook', status: 'queued' };
}

async function postToInstagram(text, mediaUrl) {
  // ← PLUG IN HERE: Instagram Graph API (requires media container flow)
  // Step 1: POST /{ig-user-id}/media  → get container id
  // Step 2: POST /{ig-user-id}/media_publish  → publish container
  // For video (ElevenLabs output): use video_url parameter in Step 1
  console.log('[Instagram] Would post:', text.slice(0, 60) + '...');
  return { platform: 'instagram', status: 'queued' };
}

async function postToTikTok(text, videoUrl) {
  // ← PLUG IN HERE: TikTok Content Posting API
  // POST https://open.tiktokapis.com/v2/post/publish/video/init/
  // Requires: video_url (ElevenLabs AI video output goes here)
  console.log('[TikTok] Would post video:', videoUrl || 'no video');
  return { platform: 'tiktok', status: 'queued' };
}

async function postToPinterest(text, imageUrl) {
  // ← PLUG IN HERE: Pinterest API v5
  // POST https://api.pinterest.com/v5/pins
  //   { board_id, title, description: text, media_source: { url: imageUrl } }
  console.log('[Pinterest] Would pin:', text.slice(0, 40));
  return { platform: 'pinterest', status: 'queued' };
}

async function postToLinkedIn(text) {
  // ← PLUG IN HERE: LinkedIn Share API
  // POST https://api.linkedin.com/v2/ugcPosts
  console.log('[LinkedIn] Would share:', text.slice(0, 60) + '...');
  return { platform: 'linkedin', status: 'queued' };
}

// ── ElevenLabs AI video hook ───────────────────────────────────────────────

/**
 * ← PLUG IN HERE: call ElevenLabs / HeyGen / Runway to generate a video
 * from a script, then return the URL for TikTok / Instagram Reels.
 *
 * @param {string} script  - The spoken text for the AI avatar
 * @param {string} voiceId - ElevenLabs voice ID
 * @returns {Promise<string|null>} - Public video URL
 */
async function generateAIVideo(script, voiceId = process.env.ELEVENLABS_VOICE_ID) {
  if (!process.env.ELEVENLABS_API_KEY) {
    console.log('[ElevenLabs] API key not set — skipping video generation');
    return null;
  }
  // Example ElevenLabs Text-to-Speech call:
  // const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
  //   method: 'POST',
  //   headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ text: script, model_id: 'eleven_turbo_v2' }),
  // });
  // const buffer = await res.buffer();
  // Upload to Cloudinary / S3 and return public URL
  return null;
}

// ── Main handler ───────────────────────────────────────────────────────────

module.exports = async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Allow', 'POST, OPTIONS');
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Signature verification
  const signature = req.headers['x-t42-signature'];
  if (!verifySignature(req.body, signature)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const {
    trigger = 'daily_inspiration',
    platforms = ['facebook', 'instagram', 'tiktok', 'pinterest', 'linkedin'],
    data = {},
    media_url = null,
    generate_video = false,
    video_script = null,
  } = req.body || {};

  // Optionally generate AI video
  let videoUrl = media_url;
  if (generate_video && video_script) {
    videoUrl = await generateAIVideo(video_script);
  }

  // Build platform-specific content
  const content = buildContent(trigger, data);

  // Dispatch to each requested platform
  const results = await Promise.allSettled(
    platforms
      .filter(p => PLATFORMS[p]?.enabled)
      .map(p => {
        const text = content[p] || content.facebook;
        switch (p) {
          case 'facebook':  return postToFacebook(text, videoUrl);
          case 'instagram': return postToInstagram(text, videoUrl);
          case 'tiktok':    return postToTikTok(text, videoUrl);
          case 'pinterest': return postToPinterest(text, media_url);
          case 'linkedin':  return postToLinkedIn(text);
          default:          return Promise.resolve({ platform: p, status: 'skipped' });
        }
      })
  );

  const summary = results.map((r, i) => ({
    platform: platforms[i],
    status:   r.status === 'fulfilled' ? r.value.status : 'error',
    error:    r.status === 'rejected'  ? r.reason?.message : undefined,
  }));

  return res.status(200).json({
    success: true,
    trigger,
    dispatched: summary.filter(r => r.status !== 'error').length,
    total:      summary.length,
    results:    summary,
    timestamp:  new Date().toISOString(),
  });
};
