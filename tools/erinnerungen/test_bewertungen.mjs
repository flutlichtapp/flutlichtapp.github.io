// node test_bewertungen.mjs — Zahlen der Übersicht „Bewertungen“ (erfundene Daten)
import { summary, usage } from './bewertungen.mjs';
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok  ' : 'FAIL') + ' ' + m); if (!c) fails++; };
const now = Date.UTC(2026, 10, 26, 12);
const S = [{ date: '20.11.', type: 'training', start: '18:30' }, { date: '24.11.', type: 'training', start: '18:30' }];
const seen = { t: now - 3 * 864e5 };
const P = [
  { name: 'A', phone: '0170 1234567', birthdate: '2008-03-09', seen, s: [1, 1], rpe: [null, 6] },
  { name: 'B', phone: '+49 171 2345678', birthdate: '09.03.2008', seen, s: [1, 1], rpe: [null, 5] },
  { name: 'C', phone: '', s: [1, 1] },                       // ohne Telefon, nie geöffnet
  { name: 'D', seen, s: [1, 3] },                            // ohne Telefon, geöffnet
  { name: 'E', phone: '0172 3456789', birthdate: '2008-05-01', s: [3, 1] },           // mit Telefon, nie geöffnet
  { name: 'F', phone: '123', birthdate: '2008-07-02', seen, s: [1, 1], rpe: [null, 7] } // keine echte Nummer
];
const r = summary({ sessions: S, players: P }, '2026/27', now);
ok(r.length === 2, 'zwei Termine');
ok(r[0].here === 5 && r[0].tel === 2 && r[0].app === 4 && r[0].rated === 0, '20.11.: anwesend 5, mit Telefon 2, App je geöffnet 4, bewertet 0 – ' + JSON.stringify(r[0]));
ok(r[1].here === 5 && r[1].tel === 3 && r[1].app === 3 && r[1].rated === 3, '24.11.: anwesend 5, mit Telefon 3, App je geöffnet 3, bewertet 3 – ' + JSON.stringify(r[1]));
const u = usage({ players: P }, now);
ok(u.noBd === 2 && u.noBdNever === 1, 'ohne Geburtsdatum 2 (davon nie geöffnet 1) – C und D');
ok(u.n === 6 && u.tel === 3 && u.noTel === 3 && u.noTelNever === 1, 'Nutzung: 6 Spieler, mit Telefon 3, ohne 3 (davon nie geöffnet 1) – ' + JSON.stringify(u));
console.log(fails ? fails + ' failed' : 'all passed'); process.exit(fails ? 1 : 0);
