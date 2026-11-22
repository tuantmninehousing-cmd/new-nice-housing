"use client";

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Hotel } from '../../types/hotel';
import { useLanguage } from '@/context/LanguageContext';
import { AM, AR, BUILDINGS, Building, DIST, HOME_TEXT, LANGS, Q, RoomRow, TY, UN } from '@/data/nine';
import { HOTLINE, HOTLINE_TEL } from '@/components/Layout/Navbar';

interface BlogPost {
    id: number;
    slug: string;
    title: string;
    excerpt: string;
    date: string;
    image: string;
}

interface HomeViewProps {
    hotels: Hotel[];
    loading?: boolean;
    onNavigateToList: () => void;
    onNavigateToDetails: (hotel: Hotel) => void;
}

const ZALO_URL = 'https://zalo.me/0968071393';
const LOCALES = ['vi-VN', 'en-US', 'ja-JP', 'ko-KR'];

// Chữ dùng cho bản đang chạy thật (4 ngôn ngữ, thứ tự vi, en, ja, ko).
// Phần đặt phòng: khách gửi yêu cầu, lễ tân xác nhận (chưa nối lịch phòng tự động).
const LIVE = {
    bookLead: [
        'Chọn tòa nhà và hạng phòng, xem giá, rồi gửi yêu cầu đặt phòng. Lễ tân Nine Housing kiểm tra phòng trống và xác nhận lại với bạn.',
        'Choose a building and room type, see the rates, then send a booking request. Our front desk checks availability and confirms with you.',
        '物件と部屋タイプを選んで料金を確認し、予約リクエストを送信してください。スタッフが空室を確認してご連絡します。',
        '건물과 객실 타입을 고르고 요금을 확인한 뒤 예약 요청을 보내 주세요. 프런트에서 빈 객실을 확인해 연락드립니다.',
    ],
    bookNote: [
        'Sau khi gửi yêu cầu, lễ tân liên hệ xác nhận phòng trống và tổng tiền.',
        'After you send a request, our front desk confirms availability and the total.',
        'リクエスト送信後、スタッフが空室と合計金額を確認してご連絡します。',
        '요청을 보내시면 프런트에서 빈 객실과 총액을 확인해 연락드립니다.',
    ],
    step2Title: ['Gửi yêu cầu đặt phòng', 'Send a booking request', '予約リクエストを送信', '예약 요청 보내기'],
    step2Text: [
        'Chọn ngày nhận, ngày trả phòng và để lại thông tin liên hệ.',
        'Pick your check-in and check-out dates and leave your contact details.',
        'チェックイン・チェックアウト日を選び、ご連絡先を入力してください。',
        '체크인·체크아웃 날짜를 선택하고 연락처를 남겨 주세요.',
    ],
    step3Text: [
        'Lễ tân liên hệ để xác nhận và gửi hướng dẫn nhận phòng.',
        'Our front desk contacts you to confirm and send check-in instructions.',
        'スタッフよりご連絡のうえ、チェックインのご案内をお送りします。',
        '프런트에서 연락드려 확인 후 체크인 안내를 보내드립니다.',
    ],
    journey: [
        [['01', 'Khởi đầu.', 'Nine Housing bắt đầu từ những căn hộ đầu tiên tại Hà Nội.'], ['02', 'Mở rộng.', 'Nhiều tòa căn hộ tại Ba Đình.'], ['03', 'Đến Tây Hồ.', 'Căn 2–3 phòng ngủ nhìn ra Hồ Tây, nơi đặt văn phòng Nine Housing.']],
        [['01', 'The start.', 'Nine Housing began with its first apartments in Hanoi.'], ['02', 'Growing.', 'More apartment buildings across Ba Dinh.'], ['03', 'West Lake.', '2–3 bedroom apartments facing West Lake, home to the Nine Housing office.']],
        [['01', 'はじまり。', 'Nine Housingはハノイの最初のアパートメントから始まりました。'], ['02', '拡大。', 'バーディン区に物件を拡大。'], ['03', '西湖へ。', '西湖を望む2〜3ベッドルーム。Nine Housingのオフィスもここにあります。']],
        [['01', '시작.', 'Nine Housing은 하노이의 첫 아파트에서 시작했습니다.'], ['02', '확장.', '바딘 지역에 여러 건물을 운영합니다.'], ['03', '서호로.', '서호가 보이는 침실 2~3개 아파트, Nine Housing 사무실이 있는 곳입니다.']],
    ],
    noPromo: [
        'Hiện chưa có chương trình khuyến mãi. Mời bạn quay lại sau hoặc nhắn Nine Housing để được báo giá tốt nhất.',
        'There are no offers at the moment. Please check back later or message Nine Housing for our best rate.',
        '現在実施中のキャンペーンはありません。最新の料金はNine Housingまでお問い合わせください。',
        '현재 진행 중인 프로모션이 없습니다. 최적 요금은 Nine Housing으로 문의해 주세요.',
    ],
    allPromo: ['Xem tất cả khuyến mãi', 'See all offers', 'すべてのキャンペーン', '모든 프로모션 보기'],
    apps: ['Nhắn Zalo hoặc gọi hotline; hoặc bấm “Chat với Nine” ở góc màn hình.', 'Message us on Zalo or call the hotline; or tap “Chat with Nine” at the corner of the screen.', 'Zaloまたはお電話で。画面の「Nineとチャット」もご利用ください。', 'Zalo 또는 전화로 문의하시거나 화면 모서리의 “Nine과 채팅”을 눌러 주세요.'],
    helpTitle: ['Cần tư vấn chọn phòng?', 'Need help choosing a room?', 'お部屋選びのご相談', '객실 선택 상담'],
    helpText: [
        'Cho Nine Housing biết ngày ở, số người và khu bạn muốn ở. Chúng tôi gợi ý căn phù hợp và báo giá ngay.',
        'Tell us your dates, number of guests and preferred area. We will suggest a suitable apartment and quote right away.',
        'ご希望の日程・人数・エリアをお知らせください。最適なお部屋と料金をすぐにご案内します。',
        '날짜, 인원, 원하시는 지역을 알려 주세요. 알맞은 객실과 요금을 바로 안내해 드립니다.',
    ],
    call: ['Gọi', 'Call', '電話', '전화'],
};

export const HomeView: React.FC<HomeViewProps> = ({ hotels, onNavigateToDetails }) => {
    const router = useRouter();
    const { language } = useLanguage();
    const li = Math.max(0, LANGS.findIndex((l) => l[0] === language));
    const T = HOME_TEXT[language];

    const [area, setArea] = useState('all');
    const [code, setCode] = useState(BUILDINGS[0].code);
    const [roomIdx, setRoomIdx] = useState(0);
    const [posts, setPosts] = useState<BlogPost[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [settings, setSettings] = useState<any>(null);

    useEffect(() => {
        fetch('/api/blogs')
            .then((r) => r.json())
            .then((d) => setPosts(Array.isArray(d) ? d.slice(0, 3) : []))
            .catch(() => { });
        fetch('/api/settings')
            .then((r) => r.json())
            .then((d) => { if (d && !d.error) setSettings(d); })
            .catch(() => { });
    }, []);

    // Khi vào trang chủ kèm #mục (từ trang khác) thì cuộn tới mục đó
    useEffect(() => {
        const id = typeof window !== 'undefined' ? window.location.hash.replace('#', '') : '';
        if (!id) return;
        const tm = window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }), 60);
        return () => window.clearTimeout(tm);
    }, []);

    // Ghép tòa nhà với mục tương ứng trong trang quản trị (để lấy ảnh mới và mở trang đặt phòng)
    const hotelOf = useMemo(() => {
        const map: Record<string, Hotel | undefined> = {};
        BUILDINGS.forEach((b) => {
            map[b.code] = hotels.find((h) => b.match.test(`${h.name} ${h.location}`));
        });
        return map;
    }, [hotels]);

    const money = (k: number) => (k * 1000).toLocaleString(LOCALES[li]) + ' ₫';
    const roomLabel = (x: RoomRow) => TY[x[0]][li] + ' · ' + x[1] + ' m²' + (x[2] ? ' · ' + Q[x[2]][li] : '');
    const typeSummary = (b: Building) => Array.from(new Set(b.r.map((x) => TY[x[0]][li]))).join(' · ');
    const descOf = (b: Building) => [b.units + ' ' + UN[li], DIST[b.d][li], typeSummary(b)].join(' · ');
    const typesOf = (b: Building) => Array.from(new Set(b.r.map((x) => TY[x[0]][li] + ' ' + x[1] + ' m²'))).join(', ');
    const imgOf = (b: Building) => hotelOf[b.code]?.image || b.img;

    const sel = BUILDINGS.find((b) => b.code === code) || BUILDINGS[0];
    const shown = BUILDINGS.filter((b) => area === 'all' || b.area === area);
    const stats = [['126', T.stats[0]], ['2', T.stats[1]], ['4', T.stats[2]], ['24/7', T.stats[3]]];

    const scrollTo = (id: string) => (e: React.MouseEvent) => {
        e.preventDefault();
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const book = (b: Building) => {
        const h = hotelOf[b.code];
        if (h) onNavigateToDetails(h);
        else document.getElementById('lien-he')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    const pickBuilding = (c: string) => { setCode(c); setRoomIdx(0); };

    const fmtDate = (s: string) => {
        const d = new Date(s);
        return isNaN(d.getTime()) ? '' : d.toLocaleDateString(LOCALES[li], { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const officeAddress = language === 'vi'
        ? (settings?.address_value_vi || 'Số 136 phố Vũ Miên, phường Tây Hồ, Hà Nội')
        : (settings?.address_value_en || 'No. 136 Vu Mien Street, Tay Ho Ward, Hanoi, Vietnam');

    return (
        <div className="nh-home page-transition">
            {/* ẢNH ĐẦU TRANG */}
            <div className="nh-hero" id="top">
                <img className="nh-hero-img" src="/nine/hero.jpg" alt={T.hero.alt} />
                <div className="nh-hero-shade"></div>
                <div className="nh-wrap nh-hero-in">
                    <div className="nh-hero-frame">
                        <p className="nh-eyebrow gold">{T.hero.eyebrow}</p>
                        <h1>{T.hero.h1}</h1>
                        <p className="nh-live">Live your way</p>
                        <div className="nh-rule"></div>
                        <p className="nh-hero-lead">{T.hero.lead}</p>
                        <div className="nh-hero-cta">
                            <a className="nh-btn-gold lg" href="#dat-phong" onClick={scrollTo('dat-phong')}>{T.hero.cta1}</a>
                            <a className="nh-btn-line lg" href="#toa-nha" onClick={scrollTo('toa-nha')}>{T.hero.cta2}</a>
                        </div>
                    </div>
                </div>
            </div>

            {/* CON SỐ */}
            <div className="nh-stats-band">
                <div className="nh-wrap nh-stats">
                    {stats.map(([n, label]) => (
                        <div key={n} className="nh-stat"><div className="n">{n}</div><div className="l">{label}</div></div>
                    ))}
                </div>
            </div>

            {/* 1. GIỚI THIỆU */}
            <div id="gioi-thieu" className="nh-anchor nh-wrap nh-intro">
                <div className="nh-intro-text">
                    <p className="nh-eyebrow">{T.intro.eyebrow}</p>
                    <h2>{T.intro.h2}</h2>
                    <p className="nh-p">{T.intro.p1}</p>
                    <p className="nh-p">{T.intro.p2}</p>
                    <div className="nh-pillars">
                        {T.intro.pillars.map((p) => (
                            <div key={p.title} className="nh-pillar"><div className="t">{p.title}</div><p>{p.text}</p></div>
                        ))}
                    </div>
                </div>
                <div className="nh-journey">
                    <div className="nh-diamond" aria-hidden="true"></div>
                    <h3>{T.intro.journey}</h3>
                    <ol>
                        {LIVE.journey[li].map(([when, title, text]) => (
                            <li key={when}><span className="when">{when}</span><span><b>{title}</b> {text}</span></li>
                        ))}
                        <li><span className="when">{T.intro.steps[3].when}</span><span><b>{T.intro.steps[3].title}</b> {T.intro.steps[3].text}</span></li>
                    </ol>
                </div>
            </div>

            {/* 2. TÒA NHÀ */}
            <div id="toa-nha" className="nh-anchor nh-band-white">
                <div className="nh-wrap nh-pad">
                    <div className="nh-head-row">
                        <div style={{ maxWidth: '640px' }}>
                            <p className="nh-eyebrow">{T.bld.eyebrow}</p>
                            <h2>{T.bld.h2}</h2>
                            <p className="nh-lead">{T.bld.lead}</p>
                        </div>
                        <div className="nh-chips" role="group" aria-label={T.bld.filter}>
                            {Object.keys(AR).map((k) => (
                                <button key={k} type="button" className={area === k ? 'on' : ''} aria-pressed={area === k} onClick={() => setArea(k)}>{AR[k][li]}</button>
                            ))}
                        </div>
                    </div>
                    <div className="nh-grid">
                        {shown.map((b) => (
                            <article key={b.code} className="nh-card">
                                <div className="nh-card-img">
                                    <img src={imgOf(b)} alt={b.name} loading="lazy" />
                                    <span className="nh-badge">{DIST[b.d][li]}</span>
                                </div>
                                <div className="nh-card-body">
                                    <h3>{b.name}</h3>
                                    <p className="addr">{b.addr}</p>
                                    <p className="desc">{descOf(b)}</p>
                                    <div className="nh-tags">{b.am.map((a) => <span key={a}>{AM[a][li]}</span>)}</div>
                                    <p className="types">{T.bld.types}: <b>{typesOf(b)}</b></p>
                                </div>
                            </article>
                        ))}
                    </div>
                </div>
            </div>

            {/* 3. ĐẶT PHÒNG */}
            <div id="dat-phong" className="nh-anchor nh-wrap nh-pad">
                <p className="nh-eyebrow">{T.book.eyebrow}</p>
                <h2>{T.book.h2}</h2>
                <p className="nh-lead" style={{ maxWidth: '720px', marginBottom: '28px' }}>{LIVE.bookLead[li]}</p>

                <form className="nh-book-form" aria-label={T.book.h2} onSubmit={(e) => { e.preventDefault(); book(sel); }}>
                    <label className="nh-field">{T.book.fBuilding}
                        <select className="nh-input" value={sel.code} onChange={(e) => pickBuilding(e.target.value)}>
                            {BUILDINGS.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
                        </select>
                    </label>
                    <label className="nh-field">{T.book.fType}
                        <select className="nh-input" value={roomIdx} onChange={(e) => setRoomIdx(Number(e.target.value))}>
                            {sel.r.map((x, i) => <option key={i} value={i}>{roomLabel(x)}</option>)}
                        </select>
                    </label>
                    <button type="submit" className="nh-btn-navy">{T.book.book}</button>
                    <p className="nh-form-note">{LIVE.bookNote[li]}</p>
                </form>

                <div className="nh-price">
                    <div className="nh-price-head">
                        <img src={imgOf(sel)} alt={sel.name} />
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <div className="name">{sel.name}</div>
                            <div className="sub">{sel.addr}</div>
                        </div>
                        <div className="sub">{T.book.priceSrc}</div>
                    </div>
                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th scope="col">{T.book.thType}</th>
                                    <th scope="col" className="r">{T.book.thWd}</th>
                                    <th scope="col" className="r">{T.book.thWe}</th>
                                    <th scope="col"><span className="nh-sr">{T.book.book}</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sel.r.map((x, i) => (
                                    <tr key={i} className={i === roomIdx ? 'sel' : ''}>
                                        <td className="b">{roomLabel(x)}</td>
                                        <td className="r">{money(x[3])}</td>
                                        <td className="r">{money(x[4])}</td>
                                        <td className="r"><button type="button" className="nh-btn-gold" onClick={() => book(sel)}>{T.book.book}</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="nh-price-note">{T.book.priceNote}</p>
                </div>

                <ol className="nh-steps">
                    <li><div className="n">01</div><h3>{T.book.steps[0].title}</h3><p>{T.book.steps[0].text}</p></li>
                    <li><div className="n">02</div><h3>{LIVE.step2Title[li]}</h3><p>{LIVE.step2Text[li]}</p></li>
                    <li><div className="n">03</div><h3>{T.book.steps[2].title}</h3><p>{LIVE.step3Text[li]}</p></li>
                </ol>
            </div>

            {/* 4. KHUYẾN MÃI (lấy từ mục Blogs trong trang quản trị) */}
            <div id="khuyen-mai" className="nh-anchor nh-band-navy">
                <div className="nh-wrap nh-pad">
                    <p className="nh-eyebrow gold">{T.promo.eyebrow}</p>
                    <h2>{T.promo.h2}</h2>
                    <p className="nh-lead light" style={{ maxWidth: '720px', marginBottom: '30px' }}>{T.promo.lead}</p>
                    {posts.length === 0 ? (
                        <p className="nh-empty">{LIVE.noPromo[li]}</p>
                    ) : (
                        <>
                            <div className="nh-grid">
                                {posts.map((p) => (
                                    <article key={p.id} className="nh-card promo" onClick={() => router.push(`/blogs/${p.slug}`)}>
                                        <div className="nh-card-img wide">
                                            {p.image ? <img src={p.image} alt="" loading="lazy" /> : null}
                                            <span className="nh-badge gold">{T.promo.tag}</span>
                                        </div>
                                        <div className="nh-card-body">
                                            <h3><Link href={`/blogs/${p.slug}`}>{p.title}</Link></h3>
                                            <p className="desc">{p.excerpt}</p>
                                            <p className="when">{fmtDate(p.date)}</p>
                                        </div>
                                    </article>
                                ))}
                            </div>
                            <p style={{ marginTop: '28px' }}><Link className="nh-btn-line" href="/blogs">{LIVE.allPromo[li]}</Link></p>
                        </>
                    )}
                </div>
            </div>

            {/* 5. LIÊN HỆ */}
            <div id="lien-he" className="nh-anchor nh-wrap nh-pad nh-contact">
                <div className="nh-contact-left">
                    <p className="nh-eyebrow">{T.contact.eyebrow}</p>
                    <h2>{T.contact.h2}</h2>
                    <dl>
                        <div><dt>{T.contact.office}</dt><dd>{officeAddress}</dd></div>
                        <div><dt>{T.contact.hotline}</dt><dd className="big"><a href={HOTLINE_TEL}>{HOTLINE}</a></dd></div>
                        <div><dt>{T.contact.apps}</dt><dd>{LIVE.apps[li]}</dd></div>
                    </dl>
                </div>
                <div className="nh-help">
                    <div className="nh-diamond" aria-hidden="true"></div>
                    <h3>{LIVE.helpTitle[li]}</h3>
                    <p>{LIVE.helpText[li]}</p>
                    <div className="nh-help-actions">
                        <a className="nh-btn-gold lg" href={ZALO_URL} target="_blank" rel="noopener noreferrer">Zalo {HOTLINE}</a>
                        <a className="nh-btn-line lg" href={HOTLINE_TEL}><i className="fa-solid fa-phone"></i>&nbsp;{LIVE.call[li]} {HOTLINE}</a>
                    </div>
                    <p className="nh-live small">Live your way</p>
                </div>
            </div>
        </div>
    );
};
