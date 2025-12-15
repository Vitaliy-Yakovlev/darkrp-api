/* eslint-env node */
import axios from 'axios';
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
      console.log('🔍 Received steamId64 from Steam OpenID:', steamId64);

      // Проверяем формат steamId64 (должен быть 17 цифр, начинаться с 7656119...)
      if (!steamId64 || steamId64.length < 17 || !steamId64.startsWith('7656119')) {
        console.error('⚠️ Invalid steamId64 format:', steamId64);
      }

      const steamId = convertSteamId64ToSteamId(steamId64);
      console.log('🔍 Converted to steamId:', steamId);

      // Получаем данные из Steam API
      console.log('🔍 Fetching Steam data for steamId64:', steamId64);
      const steamData = await getSteamUserData(steamId64);
      console.log('📦 Steam data received:', steamData);

      let user = null;
      try {
        const users = await db.query('iga', 'SELECT * FROM player WHERE SteamID = ? LIMIT 1', [steamId]);
        if (users && users.length > 0) {
          user = {
            steamId: users[0].SteamID,
            steamId64: steamId64,
            name: users[0].SteamName || users[0].name || steamData?.name || 'Unknown',
            avatar: users[0].avatar || steamData?.avatar || null,
            rank: users[0].Rank || null,
          };
        } else {
          user = {
            steamId: steamId,
            steamId64: steamId64,
            name: steamData?.name || 'Unknown',
            avatar: steamData?.avatar || null,
            rank: null,
          };
        }
      } catch (dbError) {
        console.error('❌ Database error fetching user:', dbError);
        user = {
          steamId: steamId,
          steamId64: steamId64,
          name: steamData?.name || 'Unknown',
          avatar: steamData?.avatar || null,
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
      console.log('📥 User data from token:', userData);

      // Если нет steamId64, но есть steamId, конвертируем его
      let steamId64 = userData.steamId64;
      if (!steamId64 && userData.steamId) {
        steamId64 = convertSteamIdToSteamId64(userData.steamId);
        console.log('🔄 Converted steamId to steamId64:', steamId64);
      }

      const users = await db.query('iga', 'SELECT * FROM player WHERE SteamID = ? LIMIT 1', [userData.steamId]);
      if (users && users.length > 0) {
        let avatar = users[0].avatar || null;
        let name = users[0].SteamName || users[0].name || 'Unknown';

        // Если нет аватара или имени в БД и есть steamId64, получаем из Steam
        if (steamId64 && (!avatar || name === 'Unknown')) {
          console.log('🔍 Fetching Steam data for user from DB');
          const steamData = await getSteamUserData(steamId64);
          if (steamData) {
            if (!avatar && steamData.avatar) avatar = steamData.avatar;
            if (name === 'Unknown' && steamData.name) name = steamData.name;
          }
        }

        const user = {
          steamId: users[0].SteamID,
          steamId64: steamId64 || null,
          name: name,
          avatar: avatar,
          rank: users[0].Rank || null,
        };
        console.log('✅ Returning user data:', user);
        res.json(user);
      } else {
        let avatar = userData.avatar || null;
        let name = userData.name || 'Unknown';

        // Если нет данных в БД и есть steamId64, получаем из Steam
        if (steamId64 && (!avatar || name === 'Unknown')) {
          console.log('🔍 Fetching Steam data for user not in DB');
          const steamData = await getSteamUserData(steamId64);
          if (steamData) {
            if (!avatar && steamData.avatar) avatar = steamData.avatar;
            if (name === 'Unknown' && steamData.name) name = steamData.name;
          }
        }

        const result = {
          ...userData,
          steamId64: steamId64 || null,
          name: name,
          avatar: avatar,
        };
        console.log('✅ Returning user data (not in DB):', result);
        res.json(result);
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

function convertSteamIdToSteamId64(steamId) {
  // Формат: STEAM_X:Y:Z
  const match = steamId.match(/^STEAM_(\d+):(\d+):(\d+)$/);
  if (!match) {
    console.error('Invalid SteamID format:', steamId);
    return null;
  }

  const universe = BigInt(match[1]);
  const Y = BigInt(match[2]);
  const Z = BigInt(match[3]);

  // Правильная формула: steamId64 = (Z * 2) + Y + 76561197960265728
  // Где 76561197960265728 = 0x0110000100000000 (магическое число Steam)
  const accountId = (Z << 1n) | Y;
  const baseSteamId64 = 0x0110000100000000n; // 76561197960265728
  const steamId64 = baseSteamId64 + accountId;

  const result = steamId64.toString();
  console.log(`🔄 Converted ${steamId} to steamId64: ${result} (should start with 7656119)`);

  // Проверка формата
  if (!result.startsWith('7656119') || result.length !== 17) {
    console.error(`⚠️ Invalid steamId64 format: ${result}`);
  }

  return result;
}

async function getSteamUserData(steamId64) {
  if (!steamId64) {
    console.log('⚠️ No steamId64 provided');
    return null;
  }

  // Метод 1: Публичный XML endpoint Steam (не требует API ключа)
  try {
    const xmlUrl = `https://steamcommunity.com/profiles/${steamId64}/?xml=1`;
    console.log('🌐 Method 1: Fetching Steam XML:', xmlUrl);

    const xmlResponse = await axios.get(xmlUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/xml, text/xml, */*',
      },
      timeout: 10000,
      validateStatus: () => true,
    });

    const xmlData = xmlResponse.data || '';
    console.log('📄 XML received, length:', xmlData.length);
    console.log('📊 XML response status:', xmlResponse.status);

    // Проверяем, не ошибка ли это
    if (xmlData.includes('Error') || xmlResponse.status !== 200) {
      console.log('⚠️ XML endpoint returned error');
    } else {
      // Парсим XML - ищем steamID (имя) и avatarFull
      const nameMatch =
        xmlData.match(/<steamID><!\[CDATA\[([^\]]+)\]\]><\/steamID>/i) || xmlData.match(/<steamID>([^<]+)<\/steamID>/i);
      const avatarMatch =
        xmlData.match(/<avatarFull><!\[CDATA\[([^\]]+)\]\]><\/avatarFull>/i) ||
        xmlData.match(/<avatarFull>([^<]+)<\/avatarFull>/i);

      if (nameMatch || avatarMatch) {
        let avatar = avatarMatch ? avatarMatch[1].trim() : null;

        // Убираем суффикс размера из аватара, если есть
        if (avatar) {
          avatar = avatar.replace(/\?.*$/, ''); // Убираем параметры
          avatar = avatar.replace(/_[a-z]+\.jpg$/i, '.jpg'); // Убираем суффикс размера
        }

        const result = {
          name: nameMatch ? nameMatch[1].trim() : null,
          avatar: avatar,
        };
        console.log('✅ Steam data extracted from XML:', result);
        if (result.name && result.name !== 'Error' && (result.name || result.avatar)) {
          return result;
        }
      }
    }
  } catch (error) {
    console.log('⚠️ XML method failed:', error.message);
    if (error.response) {
      console.log('⚠️ XML error status:', error.response.status);
    }
  }

  // Метод 2: Парсинг HTML страницы Steam
  try {
    const profileUrl = `https://steamcommunity.com/profiles/${steamId64}`;
    console.log('🌐 Method 2: Fetching Steam HTML:', profileUrl);

    const response = await axios.get(profileUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        Referer: 'https://steamcommunity.com/',
      },
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: () => true, // Принимаем любой статус
    });

    const html = response.data || '';
    console.log('📄 HTML received, length:', html.length);
    console.log('📊 Response status:', response.status);

    // Ищем имя пользователя - несколько способов
    let name = null;

    // Способ 1: og:title
    const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
    if (ogTitleMatch) {
      name = ogTitleMatch[1].trim();
      console.log('✅ Found name via og:title:', name);
    }

    // Способ 2: из title (но пропускаем страницы ошибок)
    if (!name) {
      const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
      if (titleMatch) {
        const rawTitle = titleMatch[1].trim();
        // Пропускаем страницы ошибок
        if (!rawTitle.toLowerCase().includes('error') && !rawTitle.toLowerCase().includes('not found')) {
          name = rawTitle
            .replace(/Steam Community\s*::\s*/i, '')
            .replace(/\s*-\s*Steam Community/i, '')
            .trim();
          if (name && name.length > 0) {
            console.log('✅ Found name via title:', name);
          }
        } else {
          console.log('⚠️ Title indicates error page:', rawTitle);
        }
      }
    }

    // Способ 3: из playerAvatarHolder
    if (!name) {
      const playerNameMatch = html.match(/<span\s+class=["']actual_persona_name["'][^>]*>([^<]+)<\/span>/i);
      if (playerNameMatch) {
        name = playerNameMatch[1].trim();
        console.log('✅ Found name via actual_persona_name:', name);
      }
    }

    // Ищем аватар - несколько способов
    let avatar = null;

    // Способ 1: og:image
    const ogImageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (ogImageMatch) {
      avatar = ogImageMatch[1];
      // Убираем параметры
      avatar = avatar.replace(/\?.*$/, '');
      // Убираем суффикс размера (_full, _medium, _small) - оставляем просто .jpg
      avatar = avatar.replace(/_[a-z]+\.jpg$/i, '.jpg');
      console.log('✅ Found avatar via og:image:', avatar);
    }

    // Способ 2: playerAvatarHolder
    if (!avatar) {
      const avatarMatch = html.match(/<img[^>]*class=["'][^"']*playerAvatar[^"']*["'][^>]*src=["']([^"']+)["']/i);
      if (avatarMatch) {
        avatar = avatarMatch[1];
        // Убираем параметры
        avatar = avatar.replace(/\?.*$/, '');
        // Убираем суффикс размера (_full, _medium, _small) - оставляем просто .jpg
        avatar = avatar.replace(/_[a-z]+\.jpg$/i, '.jpg');
        if (!avatar.startsWith('http')) {
          avatar = 'https://steamcdn-a.akamaihd.net' + avatar;
        }
        console.log('✅ Found avatar via playerAvatar:', avatar);
      }
    }

    // Способ 3: из JSON данных на странице
    if (!avatar || !name) {
      const jsonMatch = html.match(/<script[^>]*>.*?rgProfileData\s*=\s*({[^}]+})/s);
      if (jsonMatch) {
        try {
          const profileData = JSON.parse(jsonMatch[1]);
          if (!name && profileData.strPersonaName) {
            name = profileData.strPersonaName;
            console.log('✅ Found name via rgProfileData:', name);
          }
          if (!avatar && profileData.strAvatarFull) {
            avatar = profileData.strAvatarFull;
            // Убираем суффикс размера из аватара
            avatar = avatar.replace(/\?.*$/, ''); // Убираем параметры
            avatar = avatar.replace(/_[a-z]+\.jpg$/i, '.jpg'); // Убираем суффикс размера
            console.log('✅ Found avatar via rgProfileData:', avatar);
          }
        } catch {
          console.log('⚠️ Could not parse rgProfileData JSON');
        }
      }
    }

    const result = {
      name: name || null,
      avatar: avatar || null,
    };

    console.log('📦 Final extracted data:', result);

    if (!name && !avatar) {
      console.log('⚠️ Could not extract any data from Steam profile');
      // Сохраняем часть HTML для отладки
      console.log('📄 HTML sample (first 2000 chars):', html.substring(0, 2000));
    }

    return result;
  } catch (error) {
    console.error('❌ Error fetching Steam profile:', error.message);
    if (error.response) {
      console.error('❌ Steam response status:', error.response.status);
      console.error('❌ Steam response headers:', error.response.headers);
    }
    if (error.code) {
      console.error('❌ Error code:', error.code);
    }
  }

  return null;
}

export default router;

