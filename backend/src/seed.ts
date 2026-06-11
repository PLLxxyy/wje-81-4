import db from './database';

export function seedSampleData() {
  const concertCount = db.prepare('SELECT COUNT(*) as count FROM concerts').get() as { count: number };
  
  if (concertCount.count > 0) {
    console.log('已存在演唱会数据，跳过初始化');
    return;
  }

  const sampleConcerts = [
    {
      title: '周杰伦2026「嘉年华」世界巡回演唱会',
      artist: '周杰伦',
      city: '上海',
      venue: '梅赛德斯-奔驰文化中心',
      date: '2026-07-15',
      time: '19:30',
      description: '华语乐坛天王周杰伦2026年全新巡演，带你重温经典，见证新歌首唱！',
      poster_url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=concert%20poster%20jay%20chou%20carnival%20tour%202026%20shanghai&image_size=portrait_4_3',
      tiers: [
        { name: '内场VIP', price: 2880, totalSeats: 200, color: '#FFD700' },
        { name: '内场A区', price: 1880, totalSeats: 400, color: '#FF6B6B' },
        { name: '看台A区', price: 1280, totalSeats: 600, color: '#4ECDC4' },
        { name: '看台B区', price: 880, totalSeats: 800, color: '#45B7D1' },
        { name: '看台C区', price: 580, totalSeats: 1000, color: '#96CEB4' }
      ]
    },
    {
      title: '五月天「人生无限公司」巡回演唱会',
      artist: '五月天',
      city: '北京',
      venue: '国家体育场（鸟巢）',
      date: '2026-08-01',
      time: '19:00',
      description: '五月天再度出发，用音乐点亮你的人生！',
      poster_url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=mayday%20concert%20tour%20poster%20beijing%20bird%20nest%20stadium&image_size=portrait_4_3',
      tiers: [
        { name: '内场VIP', price: 1680, totalSeats: 500, color: '#FFD700' },
        { name: '内场A区', price: 1280, totalSeats: 1000, color: '#FF6B6B' },
        { name: '看台A区', price: 880, totalSeats: 2000, color: '#4ECDC4' },
        { name: '看台B区', price: 580, totalSeats: 3000, color: '#45B7D1' },
        { name: '看台C区', price: 380, totalSeats: 5000, color: '#96CEB4' }
      ]
    },
    {
      title: 'Taylor Swift The Eras Tour 2026',
      artist: 'Taylor Swift',
      city: '香港',
      venue: '香港迪士尼乐园幻想道露天场地',
      date: '2026-09-10',
      time: '20:00',
      description: 'Taylor Swift 时代巡演首次登陆香港！',
      poster_url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=taylor%20swift%20eras%20tour%20concert%20poster%20hong%20kong&image_size=portrait_4_3',
      tiers: [
        { name: 'VIP Package', price: 5880, totalSeats: 300, color: '#FFD700' },
        { name: 'Front Row', price: 3880, totalSeats: 600, color: '#FF6B6B' },
        { name: 'General Admission A', price: 2280, totalSeats: 1500, color: '#4ECDC4' },
        { name: 'General Admission B', price: 1580, totalSeats: 2500, color: '#45B7D1' }
      ]
    },
    {
      title: '林俊杰「JJ20」世界巡回演唱会',
      artist: '林俊杰',
      city: '广州',
      venue: '广州天河体育中心体育场',
      date: '2026-07-22',
      time: '19:30',
      description: 'JJ出道20周年特别巡演，见证华语歌坛奇迹！',
      poster_url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=JJ%20Lin%2020th%20anniversary%20concert%20tour%20poster%20guangzhou&image_size=portrait_4_3',
      tiers: [
        { name: '内场VIP', price: 2280, totalSeats: 300, color: '#FFD700' },
        { name: '内场A区', price: 1580, totalSeats: 600, color: '#FF6B6B' },
        { name: '看台A区', price: 980, totalSeats: 1200, color: '#4ECDC4' },
        { name: '看台B区', price: 680, totalSeats: 2000, color: '#45B7D1' },
        { name: '看台C区', price: 480, totalSeats: 3000, color: '#96CEB4' }
      ]
    },
    {
      title: 'Coldplay Music of the Spheres World Tour',
      artist: 'Coldplay',
      city: '深圳',
      venue: '深圳湾体育中心体育场',
      date: '2026-10-05',
      time: '19:30',
      description: 'Coldplay 全新巡演，环保与音乐的完美结合！',
      poster_url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=coldplay%20music%20of%20the%20spheres%20tour%20concert%20poster%20shenzhen&image_size=portrait_4_3',
      tiers: [
        { name: 'VIP Experience', price: 4880, totalSeats: 200, color: '#FFD700' },
        { name: 'Golden Circle', price: 2880, totalSeats: 500, color: '#FF6B6B' },
        { name: 'Standing A', price: 1680, totalSeats: 2000, color: '#4ECDC4' },
        { name: 'Standing B', price: 1080, totalSeats: 3000, color: '#45B7D1' },
        { name: 'Seating', price: 680, totalSeats: 5000, color: '#96CEB4' }
      ]
    },
    {
      title: '张学友「60+」巡回演唱会',
      artist: '张学友',
      city: '成都',
      venue: '成都凤凰山体育公园专业足球场',
      date: '2026-08-18',
      time: '19:30',
      description: '歌神张学友60+巡演，经典金曲一网打尽！',
      poster_url: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=jacky%20cheung%2060%20plus%20concert%20tour%20poster%20chengdu&image_size=portrait_4_3',
      tiers: [
        { name: '内场VIP', price: 2680, totalSeats: 400, color: '#FFD700' },
        { name: '内场A区', price: 1980, totalSeats: 800, color: '#FF6B6B' },
        { name: '看台A区', price: 1280, totalSeats: 1500, color: '#4ECDC4' },
        { name: '看台B区', price: 880, totalSeats: 2500, color: '#45B7D1' },
        { name: '看台C区', price: 580, totalSeats: 4000, color: '#96CEB4' }
      ]
    }
  ];

  const tx = db.transaction(() => {
    for (const concert of sampleConcerts) {
      const concertResult = db.prepare(`
        INSERT INTO concerts (title, artist, city, venue, date, time, description, poster_url, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'upcoming')
      `).run(
        concert.title,
        concert.artist,
        concert.city,
        concert.venue,
        concert.date,
        concert.time,
        concert.description,
        concert.poster_url
      );

      const concertId = concertResult.lastInsertRowid as number;

      for (const tier of concert.tiers) {
        const tierResult = db.prepare(`
          INSERT INTO ticket_tiers (concert_id, name, price, total_seats, sold_seats, color)
          VALUES (?, ?, ?, ?, 0, ?)
        `).run(concertId, tier.name, tier.price, tier.totalSeats, tier.color);

        const tierId = tierResult.lastInsertRowid as number;

        const seatsPerRow = Math.ceil(Math.sqrt(tier.totalSeats));
        let seatCount = 0;
        for (let r = 0; r < seatsPerRow && seatCount < tier.totalSeats; r++) {
          const rowLetter = String.fromCharCode(65 + r);
          const seatsInThisRow = Math.min(seatsPerRow, tier.totalSeats - seatCount);
          for (let s = 1; s <= seatsInThisRow; s++) {
            db.prepare(`
              INSERT INTO seats (concert_id, tier_id, row, seat_number, status)
              VALUES (?, ?, ?, ?, 'available')
            `).run(concertId, tierId, rowLetter, String(s));
            seatCount++;
          }
        }
      }
    }
  });

  try {
    tx();
    console.log(`✅ 已初始化 ${sampleConcerts.length} 场示例演唱会数据`);
  } catch (error) {
    console.error('初始化数据失败:', error);
  }
}
