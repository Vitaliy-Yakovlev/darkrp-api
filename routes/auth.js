/* eslint-env node */
import express from 'express';
import openid from 'openid';
import db from '../config/databases.js';

const router = express.Router();
const STEAM_OPENID_URL = 'https://steamcommunity.com/openid';

router.get('/test', (req, res) => {
  res.json({ message: 'Auth routes are working', timestamp: new Date().toISOString() });
});

router.get('/steam', async (req, res) => {
  try {
    const hostHeader = req.get('host') || process.env.RAILWAY_PUBLIC_DOMAIN || 'localhost:3001';
    const isLocalhost = hostHeader.includes('localhost') || hostHeader.includes('127.0.0.1');
    const protocol =
      req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' || !isLocalhost ? 'https' : 'http';
    const host = process.env.BACKEND_URL?.replace(/^https?:\/\//, '') || hostHeader;
    const returnUrl = `${protocol}://${host}/api/auth/steam/return`;

    const relyingParty = new openid.RelyingParty(returnUrl, null, true, true, []);

    relyingParty.authenticate(STEAM_OPENID_URL, false, (error, authUrl) => {
      if (error) {
        console.error('❌ Steam auth error:', error);
        return res.status(500).json({ error: 'Failed to initiate Steam authentication', details: error.message });
      }
      if (!authUrl) {
        console.error('❌ No authentication URL received');
        return res.status(500).json({ error: 'No authentication URL received' });
      }
      res.redirect(authUrl);
    });
  } catch (error) {
    console.error('❌ Steam auth error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/steam/return', async (req, res) => {
  try {
    const hostHeader = req.get('host') || process.env.RAILWAY_PUBLIC_DOMAIN || 'localhost:3001';
    const isLocalhost = hostHeader.includes('localhost') || hostHeader.includes('127.0.0.1');
    const protocol =
      req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' || !isLocalhost ? 'https' : 'http';
    const host = process.env.BACKEND_URL?.replace(/^https?:\/\//, '') || hostHeader;
    const returnUrl = `${protocol}://${host}/api/auth/steam/return`;
    const relyingParty = new openid.RelyingParty(returnUrl, null, true, true, []);

    relyingParty.verifyAssertion(req, async (error, result) => {
      if (error) {
        console.error('❌ Steam verification error:', error);
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/auth/error?error=${encodeURIComponent(error.message)}`);
      }

      if (!result || !result.authenticated) {
        console.error('❌ Steam authentication failed - not authenticated');
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        return res.redirect(`${frontendUrl}/auth/error?error=not_authenticated`);
      }

      const steamId64 = result.claimedIdentifier.replace('https://steamcommunity.com/openid/id/', '');
      const steamId = convertSteamId64ToSteamId(steamId64);

      let user = null;
      try {
        const users = await db.query('iga', 'SELECT * FROM player WHERE SteamID = ? LIMIT 1', [steamId]);
        if (users && users.length > 0) {
          user = {
            steamId: users[0].SteamID,
            name: users[0].SteamName || users[0].name || 'Unknown',
            avatar: users[0].avatar || null,
            rank: users[0].Rank || null,
          };
        } else {
          user = {
            steamId: steamId,
            name: 'Unknown',
            avatar: null,
            rank: null,
          };
        }
      } catch (dbError) {
        console.error('❌ Database error fetching user:', dbError);
        user = {
          steamId: steamId,
          name: 'Unknown',
          avatar: null,
          rank: null,
        };
      }

      const token = Buffer.from(JSON.stringify(user)).toString('base64');
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/auth/success?token=${encodeURIComponent(token)}`);
    });
  } catch (error) {
    console.error('❌ Steam return error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/auth/error?error=${encodeURIComponent(error.message)}`);
  }
});

router.post('/logout', (req, res) => {
  res.json({ success: true });
});

router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    try {
      const userData = JSON.parse(Buffer.from(token, 'base64').toString());

      const users = await db.query('iga', 'SELECT * FROM player WHERE SteamID = ? LIMIT 1', [userData.steamId]);
      if (users && users.length > 0) {
        const user = {
          steamId: users[0].SteamID,
          name: users[0].SteamName || users[0].name || 'Unknown',
          avatar: users[0].avatar || null,
          rank: users[0].Rank || null,
        };
        res.json(user);
      } else {
        res.json(userData);
      }
    } catch {
      res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: error.message });
  }
});

function convertSteamId64ToSteamId(steamId64) {
  const steamId64BigInt = BigInt(steamId64);
  const universe = steamId64BigInt >> 56n;
  const accountId = steamId64BigInt & 0xffffffffffffn;
  const Y = Number(accountId & 1n);
  const Z = Number(accountId >> 1n);
  return `STEAM_${universe}:${Y}:${Z}`;
}

export default router;

