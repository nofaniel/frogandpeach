import db from '../db.js';
import { getWeather, describeWeather } from '../services/weather.js';
import { getTides, nextTides } from '../services/tides.js';

export default async function home(app) {
  app.get('/', async (req, reply) => {
    const [weather, tides] = await Promise.all([getWeather(), getTides()]);

    const recentNotes = db.prepare(
      'SELECT id, title, updated_at FROM notes ORDER BY updated_at DESC LIMIT 3'
    ).all();

    const activeLists = db.prepare(`
      SELECT l.id, l.name,
        (SELECT COUNT(*) FROM shopping_items i WHERE i.list_id = l.id AND i.checked = 0) AS unchecked,
        (SELECT COUNT(*) FROM shopping_items i WHERE i.list_id = l.id) AS total
      FROM shopping_lists l
      ORDER BY l.created_at DESC
    `).all().filter(l => l.unchecked > 0);

    let current = null;
    let today = null;
    if (weather && !weather.error) {
      const code = weather.current?.weather_code ?? 0;
      const [desc, icon] = describeWeather(code);
      current = {
        temp: weather.current?.temperature_2m,
        feels: weather.current?.apparent_temperature,
        wind: weather.current?.wind_speed_10m,
        humidity: weather.current?.relative_humidity_2m,
        desc, icon,
      };
      today = {
        max: weather.daily?.temperature_2m_max?.[0],
        min: weather.daily?.temperature_2m_min?.[0],
        sunrise: weather.daily?.sunrise?.[0],
        sunset: weather.daily?.sunset?.[0],
        precip: weather.daily?.precipitation_probability_max?.[0],
      };
    }

    const upcomingTides = nextTides(tides.events || [], 2);

    return reply.view('home', {
      title: 'Home',
      current, today,
      weatherStale: weather?.stale, weatherErr: weather?.error,
      tides: upcomingTides,
      tidesStale: tides.stale, tidesErr: tides.error,
      recentNotes, activeLists,
    });
  });
}
