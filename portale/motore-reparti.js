/* Motore della turnazione reparti: le stesse funzioni (e le stesse regole) dell'artefatto «Turnazione reparti · dicembre 2026»,
 * che a sua volta usava le regole di Congregation Manager: abilitazioni, assenze, chi ha una parte, combinazioni permesse
 * (un incarico da fermo + uno di audio/video), stesso coordinatore uscieri per tutta la settimana, niente stesso posto due
 * settimane di fila, equità rispetto ai mesi prima. Codice estratto così com'è: non contiene dati delle persone. */
(function (G) {
'use strict';
    var Js = "RITARDO",
        cz = a => a.tipo !== Js;
    var xm = new Set(["LETTERATURA", "TERRITORI"]);

    function Bm(a, t) {
        let n = [],
            i = [...a].filter(e => e.attivo).sort((e, l) => e.ordine - l.ordine);
        for (let e of i)
            for (let l of t.filter(u => u.reparto_id === e.id && u.attivo && u.posti > 0).sort((u, o) => u.ordine - o.ordine))
                for (let u = 1; u <= l.posti; u++) n.push({
                    key: `${l.id}:${u}`,
                    incarico: l,
                    reparto: e,
                    posizione: u,
                    livello: l.livello === "SETTIMANA" ? "SETTIMANA" : "ADUNANZA"
                });
        return n
    }

    function $s(a) {
        let t = a.reparto;
        return t.codice === "LETTERATURA" || t.codice === "TERRITORI" ? t.nome : a.incarico.posti > 1 && t.codice === "AUDIO_VIDEO" ? `${a.incarico.nome.replace("Microfonista","Mic.")} ${a.posizione}${a.incarico.codice==="MICROFONISTA"?a.posizione===1?" (sx)":" (dx)":""}` : a.livello === "SETTIMANA" ? a.incarico.codice === "REFERENTE" ? "Referente" : "Coordinatore" : a.incarico.nome.replace("Addetto ", "")
    }

    function dz(a, t) {
        return t === null || a === "TUTTE" || a === t
    }

    function Si(a, t, n, i, e = new Set) {
        let l = xm.has(a.reparto.codice) ? new Set(i.filter(o => o.reparto_id === a.reparto.id).map(o => o.id)) : new Set([a.incarico.id]),
            u = new Set;
        for (let o of n) l.has(o.incarico_id) && dz(o.adunanze, t) && !e.has(o.persona_id) && u.add(o.persona_id);
        return [...u]
    }

    function Ps(a, t, n) {
        let i = a.gruppoSettimana.get(n);
        return !!i && a.gruppoPersona.get(t) === i
    }
    var Ks = 1,
        Oo = 2,
        Qs = 4,
        Do = {
            ALTRO: Ks | Oo | Qs,
            AV: Oo,
            FERMO: Ks | Qs,
            PULIZIE: Qs
        },
        sz = a => !a || (Do[a] & Oo) !== 0,
        Ws = "eccezione: microfonista e parcheggio";

    function wm(a, t) {
        let n = new Map(a.map(i => [i.id, i.codice]));
        return new Map(t.map(i => {
            let e = n.get(i.reparto_id);
            return [i.id, e === "AUDIO_VIDEO" ? "AV" : e === "LETTERATURA" || e === "TERRITORI" ? "FERMO" : e === "PULIZIE" ? "PULIZIE" : "ALTRO"]
        }))
    }

    function qm(a, t) {
        let n = new Map(a.map(l => [l.id, l.codice])),
            i = (l, u) => t.filter(o => n.get(o.reparto_id) === l && o.codice === u).map(o => o.id),
            e = new Set;
        for (let l of i("AUDIO_VIDEO", "MICROFONISTA"))
            for (let u of i("USCIERI", "PARCHEGGIO")) e.add([l, u].sort().join("|"));
        return e
    }

    function rz(a, t) {
        if (a.length <= 1) return !0;
        if (new Set(t).size < t.length) return !1;
        let n = 0;
        for (let i of a) {
            if (n & Do[i]) return !1;
            n |= Do[i]
        }
        return !0
    }

    function fz(a, t, n) {
        return a.dal <= n && a.al >= t
    }

    function Ut(a, t, n, i, e, l) {
        let u = [],
            o = i.adunanze.filter(S => S.settimana_id === n.id),
            c = t ? [t.data] : o.map(S => S.data),
            s = l ?? e?.incarico_id,
            _ = c.length ? i.indisponibilita.filter(S => S.persona_id === a && c.some(m => fz(S, m, m))) : [];
        if (_.length) {
            let S = s ? i.classi?.get(s) : void 0,
                m = !!S && (Do[S] & (Ks | Oo)) === 0;
            _.some(cz) ? u.push("assente") : m || u.push("arriva tardi")
        }
        t && i.disponibilita.some(S => S.persona_id === a && S.adunanza_id === t.id && S.stato === "NO") && u.push("non disponibile");
        let v = i.turni.filter(S => S !== e && S.persona_id === a && S.settimana_id === n.id),
            r = l ?? e?.incarico_id;
        if (t && sz(r ? i.classi?.get(r) : void 0) && i.parti.some(S => S.adunanza_id === t.id && (S.assegnata_id === a || S.effettiva_id === a)) && u.push("ha una parte"), r && i.pulizie?.referenti.has(r) && !Ps(i.pulizie, a, n.id) && u.push("non \xE8 del gruppo di turno alle pulizie"), !i.classi || !r) return v.filter(m => t ? m.adunanza_id === t.id : m.adunanza_id === null).length && u.push(t ? "gi\xE0 in turno a questa adunanza" : "gi\xE0 in turno questa settimana"), u;
        let p = S => i.classi.get(S) ?? "ALTRO",
            T = v.filter(S => S.adunanza_id === null);
        if (!t && T.length) return u.push("gi\xE0 in turno questa settimana"), u;
        let y = t ? [t] : o.filter(S => !S.nessuna);
        for (let S of y) {
            let m = [...v.filter(g => g.adunanza_id === S.id), ...T];
            if (!m.length) continue;
            let d = [...m.map(g => g.incarico_id), r];
            if (!rz(d.map(p), d)) {
                if (d.length === 2 && i.eccezioni?.has([...d].sort().join("|"))) {
                    u.push(Ws);
                    break
                }
                u.push(m.some(g => g.incarico_id === r) ? "gi\xE0 in turno a questa adunanza" : "incarichi che si sovrappongono (prima, durante o dopo l'adunanza)");
                break
            }
        }
        return u
    }

    function Ym(a, t, n, i, e) {
        let l = [];
        for (let u of a.turni) {
            let o = t.find(v => v.id === u.settimana_id);
            if (!o) continue;
            let c = u.adunanza_id ? a.adunanze.find(v => v.id === u.adunanza_id) ?? null : null,
                s = n.find(v => v.incarico.id === u.incarico_id && v.posizione === u.posizione),
                _ = [];
            s && !Si(s, c?.tipo ?? null, i, e).includes(u.persona_id) && _.push("non ha questo incarico"), _.push(...Ut(u.persona_id, c, o, a, u, u.incarico_id)), _.length && l.push({
                turno: u,
                motivi: _
            })
        }
        return l
    }

    function _z(a) {
        let t = a || 1;
        return () => (t ^= t << 13, t ^= t >>> 17, t ^= t << 5, (t >>> 0) % 1e4 / 1e4)
    }

    function Fm(a, t, n) {
        let i = t.find(l => l.id === a),
            e = i ? n.find(l => l.id === i.reparto_id)?.codice : void 0;
        return e && xm.has(e) ? e : a
    }
    var ks = .5;

    function mz(a) {
        let t = a.esclusi ?? new Set,
            n = new Set(a.settimane.map(h => h.id)),
            i = [...new Map(a.posti.map(h => [h.reparto.id, h.reparto])).values()],
            e = a.ctx.adunanze.filter(h => n.has(h.settimana_id) && !h.nessuna),
            l = new Map(a.settimane.map(h => [h.id, h])),
            u = {
                ...a.ctx,
                turni: []
            },
            o = new Map,
            c = (h, R, M) => {
                let L = `${h}|${R.id}|${M??""}`,
                    B = o.get(L);
                return B === void 0 && (B = Ut(h, R, l.get(R.settimana_id), u, void 0, M).length === 0, o.set(L, B)), B
            },
            s = [];
        for (let h of e)
            for (let R of a.posti.filter(M => M.livello === "ADUNANZA")) {
                let M = Si(R, h.tipo, a.pInc, a.incarichi, t).filter(L => c(L, h, R.incarico.id));
                M.length && s.push({
                    g: Fm(R.incarico.id, a.incarichi, i),
                    cand: M
                })
            }
        let _ = [...new Set(s.flatMap(h => h.cand))],
            v = new Map(_.map(h => [h, e.filter(R => c(h, R)).length])),
            r = _.reduce((h, R) => h + v.get(R), 0) || 1,
            p = new Map(_.map(h => [h, s.length * v.get(h) / r])),
            T = s.map(h => h.cand.map(() => 1));
        for (let h = 0; h < 200; h++) {
            for (let M of T) {
                let L = M.reduce((B, sa) => B + sa, 0);
                for (let B = 0; B < M.length; B++) M[B] /= L
            }
            if (h === 199) break;
            let R = new Map;
            s.forEach((M, L) => M.cand.forEach((B, sa) => R.set(B, (R.get(B) ?? 0) + T[L][sa]))), s.forEach((M, L) => M.cand.forEach((B, sa) => {
                T[L][sa] *= p.get(B) / Math.max(R.get(B), 1e-9)
            }))
        }
        let y = a.miscela ?? ks,
            S = new Map;
        for (let h of new Set(a.pInc.map(R => R.persona_id))) t.has(h) || S.set(h, {
            disponibili: e.filter(R => c(h, R)).length,
            totale: 0,
            perGruppo: new Map
        });
        let m = new Map;
        s.forEach((h, R) => h.cand.forEach((M, L) => {
            let B = (1 - y) * T[R][L] + y / h.cand.length,
                sa = S.get(M);
            sa.totale += B, sa.perGruppo.set(h.g, (sa.perGruppo.get(h.g) ?? 0) + B), m.set(M, (m.get(M) ?? 0) + T[R][L])
        }));
        let d = a.recenti ?? [],
            g = Math.max(1, a.mesiRecenti ?? 3),
            z = new Map;
        for (let h of d) h.adunanza_id && z.set(h.persona_id, (z.get(h.persona_id) ?? 0) + 1);
        let A = [...S.keys()].filter(h => (m.get(h) ?? 0) > 0),
            C = A.length ? A.reduce((h, R) => h + (z.get(R) ?? 0), 0) / A.length : 0,
            b = new Map;
        for (let h of A) b.set(h, Math.max(0, m.get(h) - (d.length ? .5 * ((z.get(h) ?? 0) - C) / g : 0)));
        let U = [...b.values()].reduce((h, R) => h + R, 0),
            P = [...m.values()].reduce((h, R) => h + R, 0),
            G = U > 0 ? P / U : 1,
            Oa = new Map;
        for (let h of s) Oa.set(h.g, (Oa.get(h.g) ?? 0) + 1);
        let Ct = [...S].filter(([, h]) => h.totale > 0);
        for (let h = 0; h < 100; h++) {
            for (let [M, L] of Ct) {
                let B = [...L.perGruppo.values()].reduce((w, it) => w + it, 0),
                    sa = (b.get(M) ?? 0) * G;
                if (B > 0)
                    for (let [w, it] of L.perGruppo) L.perGruppo.set(w, it * sa / B)
            }
            let R = new Map;
            for (let [, M] of Ct)
                for (let [L, B] of M.perGruppo) R.set(L, (R.get(L) ?? 0) + B);
            for (let [, M] of Ct)
                for (let [L, B] of M.perGruppo) {
                    let sa = R.get(L);
                    sa > 0 && M.perGruppo.set(L, B * Oa.get(L) / sa)
                }
        }
        for (let [, h] of S) h.totale = [...h.perGruppo.values()].reduce((R, M) => R + M, 0);
        return S
    }

    function Xm(a) {
        let {
            settimane: t,
            ctx: n,
            pInc: i,
            incarichi: e,
            storico: l
        } = a, u = a.esclusi ?? new Set, o = _z(a.seme ?? 7), c = [], s = () => [...n.turni, ...c], _ = [...t, ...a.settimanaPrima ? [a.settimanaPrima] : []].sort((h, R) => h.lunedi.localeCompare(R.lunedi)), v = h => h !== a.settimanaPrima && (!a.riempi || a.riempi.includes(h.id)), r = h => s().filter(R => R.persona_id === h).length, p = (h, R) => s().filter(M => M.persona_id === h && M.incarico_id === R).length, T = h => l.filter(R => R.persona_id === h).length, y = new Set(i.map(h => h.persona_id)), S = new Map;
        for (let h of y) {
            let R = 0;
            for (let M of _)
                if (M !== a.settimanaPrima)
                    for (let L of n.adunanze.filter(B => B.settimana_id === M.id && !B.nessuna)) Ut(h, L, M, {
                        ...n,
                        turni: []
                    }).length || R++;
            S.set(h, R)
        }
        let m = new Set(e.filter(h => h.codice === "COORDINATORE" && a.posti.some(R => R.incarico.id === h.id && R.reparto.codice === "USCIERI")).map(h => h.id)),
            d = mz({
                settimane: _.filter(h => h !== a.settimanaPrima),
                ctx: n,
                posti: a.posti,
                pInc: i,
                incarichi: e,
                esclusi: u,
                miscela: a.miscela,
                recenti: a.recenti
            }),
            g = [...new Map(a.posti.map(h => [h.reparto.id, h.reparto])).values()],
            z = h => Fm(h, e, g),
            A = (h, R) => s().filter(M => M.persona_id === h && M.adunanza_id && z(M.incarico_id) === R).length,
            C = h => s().filter(R => R.persona_id === h && R.adunanza_id).length,
            b = h => {
                let R = _.indexOf(h);
                return R > 0 ? _[R - 1] : null
            },
            U = [...a.adunanzePrima ?? [], ...n.adunanze].filter((h, R, M) => !h.nessuna && M.findIndex(L => L.id === h.id) === R).sort((h, R) => h.data.localeCompare(R.data)),
            P = h => {
                let R = U.findIndex(M => M.id === h.id);
                return [U[R - 1], U[R + 1]].filter(M => !!M)
            },
            G = (h, R) => s().concat(a.precedenti ?? []).some(M => M.persona_id === h && M.adunanza_id === R),
            Oa = h => n.parti.filter(R => (R.effettiva_id ?? R.assegnata_id) === h).length,
            Ct = [];
        for (let h of _.filter(v)) {
            let R = n.adunanze.filter(M => M.settimana_id === h.id && !M.nessuna).sort((M, L) => M.data.localeCompare(L.data));
            for (let M of a.posti) {
                let L = M.livello === "SETTIMANA" ? [null] : R;
                for (let B of L) n.turni.some(w => w.settimana_id === h.id && w.incarico_id === M.incarico.id && w.posizione === M.posizione && w.adunanza_id === (B?.id ?? null)) || Ct.push({
                    s: h,
                    a: B,
                    posto: M,
                    cand: Si(M, B?.tipo ?? null, i, e, u)
                })
            }
        }
        Ct.sort((h, R) => h.s.lunedi.localeCompare(R.s.lunedi) || (h.posto.livello === "SETTIMANA" ? -1 : 0) - (R.posto.livello === "SETTIMANA" ? -1 : 0) || h.cand.length - R.cand.length);
        for (let h of Ct) {
            let R = h.cand.filter(w => Ut(w, h.a, h.s, {
                ...n,
                turni: s()
            }, void 0, h.posto.incarico.id).length === 0);
            if (R.length || (R = h.cand.filter(w => {
                    let it = Ut(w, h.a, h.s, {
                        ...n,
                        turni: s()
                    }, void 0, h.posto.incarico.id);
                    return it.length === 1 && it[0] === Ws
                })), !R.length) continue;
            let M = b(h.s),
                L = h.a ? n.adunanze.find(w => w.settimana_id === h.s.id && w.id !== h.a.id && !w.nessuna) : void 0,
                B = w => {
                    let it = S.get(w) || 1,
                        Ai = d.get(w),
                        ql = z(h.posto.incarico.id),
                        N = h.a ? (A(w, ql) + 1 - (Ai?.perGruppo.get(ql) ?? 0)) * 6 + (C(w) + 1 - (Ai?.totale ?? 0)) * 4 : p(w, h.posto.incarico.id) * 10 + r(w) / it * 6;
                    if (N += T(w) * .01 + o() * 1.2, !h.a && n.pulizie?.coordinatori.has(h.posto.incarico.id) && Ps(n.pulizie, w, h.s.id) && (N -= 8), a.evita?.some(Z => Z.persona_id === w && Z.settimana_id === h.s.id && Z.incarico_id === h.posto.incarico.id && Z.posizione === h.posto.posizione && Z.adunanza_id === (h.a?.id ?? null)) && (N += 3), h.a) {
                        let Z = m.has(h.posto.incarico.id);
                        for (let Q of P(h.a)) G(w, Q.id) && !(Z && Q.settimana_id === h.s.id) && (N += 4);
                        let na = M ? U.find(Q => Q.settimana_id === M.id && Q.tipo === h.a.tipo) : void 0;
                        na && G(w, na.id) && (N += 2);
                        let q = s().filter(Q => Q.persona_id === w && Q.adunanza_id && U.find(ha => ha.id === Q.adunanza_id)?.tipo === h.a.tipo).length;
                        N += q * .6
                    }
                    let O = (Z, na) => !!Z && s().concat(a.precedenti ?? []).some(q => q.persona_id === w && q.settimana_id === Z.id && q.incarico_id === h.posto.incarico.id && (na === void 0 || q.adunanza_id === na || na === "*"));
                    return m.has(h.posto.incarico.id) && L && O(h.s, L.id) && (N -= 100), m.has(h.posto.incarico.id) && L && Ut(w, L, h.s, {
                        ...n,
                        turni: []
                    }).length ? N += 50 : L && O(h.s, L.id) && (N += 2), O(M, "*") && (N += h.a ? 3 : 4), N
                },
                sa = new Map(R.map(w => [w, B(w)]));
            R.sort((w, it) => sa.get(w) - sa.get(it)), c.push({
                settimana_id: h.s.id,
                adunanza_id: h.a?.id ?? null,
                incarico_id: h.posto.incarico.id,
                posizione: h.posto.posizione,
                persona_id: R[0]
            })
        }
        return pz(c, {
            ...a,
            possibili: S,
            ordinate: _,
            tutteAd: U,
            coordUscieri: m,
            r: o,
            quote: d
        })
    }

    function pz(a, t) {
        if (a.length < 2) return a;
        let {
            ctx: n,
            possibili: i,
            coordUscieri: e,
            r: l
        } = t, u = t.esclusi ?? new Set, o = t.ordinate.filter(N => N !== t.settimanaPrima), c = new Set(o.map(N => N.id)), s = n.turni.filter(N => c.has(N.settimana_id)), _ = t.precedenti ?? [], v = a.map(N => ({
            ...N
        })), r = new Map(t.ordinate.map(N => [N.id, N])), p = new Map(t.tutteAd.map(N => [N.id, N])), T = t.tutteAd, y = new Map(T.map((N, O) => [N.id, O])), S = new Map(t.ordinate.map((N, O) => [N.id, O])), m = new Map(t.posti.map(N => [N.incarico.id, N.reparto.codice])), d = new Map(t.incarichi.map(N => [N.id, N.reparto_id])), g = new Map(t.posti.map(N => [N.reparto.id, N.reparto.codice])), z = N => {
            let O = m.get(N) ?? g.get(d.get(N) ?? "");
            return O === "LETTERATURA" || O === "TERRITORI" ? O : N
        }, A = new Map;
        for (let N of n.parti) {
            let O = N.effettiva_id ?? N.assegnata_id;
            O && p.has(N.adunanza_id) && A.set(O, (A.get(O) ?? 0) + 1)
        }
        let C = [...i.values()].filter(N => N > 0),
            b = C.length ? C.reduce((N, O) => N + O, 0) / C.length : 1,
            U = N => b / Math.max(i.get(N) ?? 1, 1),
            P = new Set((t.evita ?? []).map(N => `${N.settimana_id}|${N.adunanza_id}|${N.incarico_id}|${N.posizione}|${N.persona_id}`)),
            G = n.eccezioni ?? new Set,
            Oa = () => {
                let N = [...s, ...v],
                    O = 0,
                    Z = new Map,
                    na = new Map,
                    q = new Map,
                    Q = new Map,
                    ha = new Map,
                    xa = new Map,
                    Fa = new Map;
                for (let D of N) {
                    Z.set(D.persona_id, (Z.get(D.persona_id) ?? 0) + 1), D.adunanza_id && na.set(D.persona_id, (na.get(D.persona_id) ?? 0) + 1);
                    let Y = z(D.incarico_id),
                        pa = `${D.persona_id}|${Y}`;
                    if (q.set(pa, (q.get(pa) ?? 0) + 1), D.adunanza_id) {
                        let Xa = ha.get(D.adunanza_id) ?? new Map;
                        if (Xa.set(D.persona_id, (Xa.get(D.persona_id) ?? 0) + 1), ha.set(D.adunanza_id, Xa), e.has(D.incarico_id)) {
                            let et = xa.get(D.settimana_id) ?? new Set;
                            et.add(D.persona_id), xa.set(D.settimana_id, et)
                        } else {
                            let et = `${D.settimana_id}|${D.persona_id}|${Y}`;
                            Fa.set(et, (Fa.get(et) ?? 0) + 1)
                        }
                    }
                }
                for (let [D, Y] of [...N, ..._].entries()) {
                    let pa = `${Y.persona_id}|${z(Y.incarico_id)}`,
                        Xa = Q.get(pa) ?? new Set;
                    if (Xa.add(S.get(Y.settimana_id) ?? -9), Q.set(pa, Xa), D >= N.length && Y.adunanza_id) {
                        let et = ha.get(Y.adunanza_id) ?? new Map;
                        et.set(Y.persona_id, (et.get(Y.persona_id) ?? 0) + 1), ha.set(Y.adunanza_id, et)
                    }
                }
                for (let [D, Y] of t.quote) {
                    let pa = na.get(D) ?? 0;
                    O += (pa - Y.totale) ** 2 * 2
                }
                for (let [D, Y] of t.quote) {
                    let pa = (na.get(D) ?? 0) - Y.totale - 2;
                    pa > 0 && (O += pa * pa * 25)
                }
                for (let [D, Y] of t.quote)
                    for (let [pa, Xa] of Y.perGruppo) {
                        let et = q.get(`${D}|${pa}`) ?? 0;
                        O += (et - Xa) ** 2 * 1.5
                    }
                for (let [D, Y] of q) {
                    let [pa, Xa] = D.split("|");
                    t.quote.get(pa)?.perGruppo.has(Xa) || (O += Y * Y * 1.5)
                }
                for (let D of v) D.adunanza_id && N.some(Y => Y !== D && Y.persona_id === D.persona_id && Y.adunanza_id === D.adunanza_id && G.has([Y.incarico_id, D.incarico_id].sort().join("|"))) && (O += 40);
                for (let D of Q.values())
                    for (let Y of D) D.has(Y + 1) && (O += 6);
                for (let D = 1; D < T.length; D++) {
                    let Y = ha.get(T[D - 1].id),
                        pa = ha.get(T[D].id);
                    if (!Y || !pa) continue;
                    let et = T[D - 1].settimana_id === T[D].settimana_id ? xa.get(T[D].settimana_id) : void 0;
                    for (let pr of pa.keys()) Y.has(pr) && !et?.has(pr) && (O += 3)
                }
                for (let D of xa.values()) O += (D.size - 1) * 30;
                for (let D of Fa.values()) D > 1 && (O += 4 * (D - 1));
                for (let D of ha.values())
                    for (let Y of D.values()) Y > 1 && (O += 3 * (Y - 1));
                if (n.pulizie)
                    for (let D of v) !D.adunanza_id && n.pulizie.coordinatori.has(D.incarico_id) && !Ps(n.pulizie, D.persona_id, D.settimana_id) && (O += 8);
                for (let D of v) P.has(`${D.settimana_id}|${D.adunanza_id}|${D.incarico_id}|${D.posizione}|${D.persona_id}`) && (O += 2);
                return O
            },
            Ct = N => t.posti.find(O => O.incarico.id === N.incarico_id && O.posizione === N.posizione),
            h = new Map,
            R = N => {
                let O = h.get(N);
                if (!O) {
                    let Z = N.adunanza_id ? p.get(N.adunanza_id) : null;
                    O = Si(Ct(N), Z?.tipo ?? null, t.pInc, t.incarichi, u), h.set(N, O)
                }
                return O
            },
            M = (N, O) => {
                if (!R(O).includes(N)) return !1;
                let Z = O.adunanza_id ? p.get(O.adunanza_id) ?? null : null,
                    na = Ut(N, Z, r.get(O.settimana_id), {
                        ...n,
                        turni: [...n.turni, ...v]
                    }, O, O.incarico_id);
                return na.length === 0 || na.length === 1 && na[0] === Ws
            },
            L = [];
        for (let N of v) {
            if (e.has(N.incarico_id)) {
                let O = L.find(Z => e.has(Z[0].incarico_id) && Z[0].settimana_id === N.settimana_id && Z[0].persona_id === N.persona_id);
                if (O) {
                    O.push(N);
                    continue
                }
            }
            L.push([N])
        }
        let B = N => {
                for (let O = N.length - 1; O > 0; O--) {
                    let Z = Math.floor(l() * (O + 1));
                    [N[O], N[Z]] = [N[Z], N[O]]
                }
                return N
            },
            sa = (N, O) => {
                let Z = N.map(na => na.persona_id);
                return N.forEach(na => {
                    na.persona_id = O
                }), () => N.forEach((na, q) => {
                    na.persona_id = Z[q]
                })
            },
            w = N => N.every(O => M(O.persona_id, O)),
            it = Oa(),
            Ai = (N, O) => {
                let Z = N();
                if (O.every(w)) {
                    let na = Oa();
                    if (na < it - 1e-9) return it = na, !0
                }
                return Z(), !1
            },
            ql = Date.now();
        for (let N = 0; N < 12 && Date.now() - ql < 2500; N++) {
            let O = !1;
            for (let q of B([...L]))
                for (let Q of B([...R(q[0])]))
                    if (Q !== q[0].persona_id && Ai(() => sa(q, Q), [q])) {
                        O = !0;
                        break
                    } let Z = new Map;
            for (let q of L)
                if (q.length === 1 && q[0].adunanza_id) {
                    let Q = Z.get(q[0].adunanza_id) ?? [];
                    Q.push(q), Z.set(q[0].adunanza_id, Q)
                } for (let q of Z.values())
                for (let Q = 0; Q < q.length; Q++)
                    for (let ha = Q + 1; ha < q.length; ha++) {
                        let xa = q[Q],
                            Fa = q[ha];
                        if (xa[0].persona_id === Fa[0].persona_id || z(xa[0].incarico_id) === z(Fa[0].incarico_id)) continue;
                        let D = xa[0].persona_id,
                            Y = Fa[0].persona_id;
                        Ai(() => {
                            let pa = sa(xa, Y),
                                Xa = sa(Fa, D);
                            return () => {
                                Xa(), pa()
                            }
                        }, [xa, Fa]) && (O = !0)
                    }
            let na = new Map;
            for (let q of L) {
                let Q = z(q[0].incarico_id),
                    ha = na.get(Q) ?? [];
                ha.push(q), na.set(Q, ha)
            }
            for (let q of na.values())
                for (let Q = 0; Q < q.length; Q++)
                    for (let ha = Q + 1; ha < q.length; ha++) {
                        let xa = q[Q],
                            Fa = q[ha];
                        if (xa[0].persona_id === Fa[0].persona_id || xa[0].adunanza_id === Fa[0].adunanza_id) continue;
                        let D = xa[0].persona_id,
                            Y = Fa[0].persona_id;
                        Ai(() => {
                            let pa = sa(xa, Y),
                                Xa = sa(Fa, D);
                            return () => {
                                Xa(), pa()
                            }
                        }, [xa, Fa]) && (O = !0)
                    }
            if (!O) break
        }
        return v
    }

    function jm(a) {
        let t = [],
            {
                ctx: n,
                nome: i
            } = a,
            e = a.esclusi ?? new Set,
            l = [...a.settimane].sort((d, g) => d.lunedi.localeCompare(g.lunedi)),
            u = n.turni.filter(d => l.some(g => g.id === d.settimana_id)),
            o = [...new Set(a.pInc.map(d => d.persona_id))].filter(d => !e.has(d)),
            c = new Map(o.map(d => {
                let g = 0;
                for (let z of l)
                    for (let A of n.adunanze.filter(C => C.settimana_id === z.id && !C.nessuna)) Ut(d, A, z, {
                        ...n,
                        turni: []
                    }).length || g++;
                return [d, g]
            })),
            s = d => u.filter(g => g.persona_id === d).length,
            _ = [...c.values()].reduce((d, g) => d + g, 0) || 1,
            v = d => u.length * (c.get(d) ?? 0) / _,
            r = o.filter(d => s(d) >= v(d) + 2 && s(d) >= v(d) * 1.6),
            p = o.filter(d => (c.get(d) ?? 0) > 0 && (s(d) === 0 && v(d) >= 1 || s(d) <= v(d) - 2));
        for (let d of r) t.push({
            tipo: "carico",
            testo: `${i(d)} ha ${s(d)} turni, ne toccherebbero circa ${Math.round(v(d))}.`,
            persone: [d]
        });
        for (let d of p) t.push({
            tipo: "carico",
            testo: `${i(d)} ha ${s(d)} turni, ne toccherebbero circa ${Math.round(v(d))} (pu\xF2 esserci a ${c.get(d)} adunanze).`,
            persone: [d]
        });
        for (let d of r)
            for (let g of u.filter(z => z.persona_id === d)) {
                let z = l.find(U => U.id === g.settimana_id),
                    A = g.adunanza_id ? n.adunanze.find(U => U.id === g.adunanza_id) ?? null : null,
                    C = a.posti.find(U => U.incarico.id === g.incarico_id && U.posizione === g.posizione);
                if (!C) continue;
                let b = Si(C, A?.tipo ?? null, a.pInc, a.incarichi, e).filter(U => p.includes(U) && !Ut(U, A, z, n, void 0, g.incarico_id).length);
                if (b.length) {
                    t.push({
                        tipo: "scambio",
                        testo: `Valuta di dare a ${i(b[0])} il turno ${a.etichetta(g.incarico_id)} ${A?`del ${A.data.slice(8)}/${A.data.slice(5,7)}`:"della settimana"} (ora di ${i(d)}).`,
                        settimana_id: z.id,
                        persone: [b[0], d]
                    });
                    break
                }
            }
        let T = [...a.settimanaPrima ? [a.settimanaPrima] : [], ...l],
            y = [...u, ...a.precedenti ?? []];
        for (let d = 1; d < T.length; d++) {
            let g = T[d - 1],
                z = T[d];
            for (let A of y.filter(C => C.settimana_id === z.id)) y.some(C => C.settimana_id === g.id && C.persona_id === A.persona_id && C.incarico_id === A.incarico_id) && !t.some(C => C.tipo === "di_fila" && C.settimana_id === z.id && C.persone[0] === A.persona_id) && t.push({
                tipo: "di_fila",
                testo: `${i(A.persona_id)} fa ${a.etichetta(A.incarico_id)} due settimane di fila.`,
                settimana_id: z.id,
                persone: [A.persona_id]
            })
        }
        let S = new Set(a.incarichi.filter(d => d.codice === "COORDINATORE" && a.posti.some(g => g.incarico.id === d.id && g.reparto.codice === "USCIERI")).map(d => d.id));
        for (let d of l) {
            let g = n.adunanze.filter(C => C.settimana_id === d.id && !C.nessuna);
            if (g.length < 2) continue;
            let z = u.filter(C => C.adunanza_id === g[0].id),
                A = u.filter(C => C.adunanza_id === g[1].id);
            for (let C of z) A.find(U => U.incarico_id === C.incarico_id && U.persona_id === C.persona_id) && !S.has(C.incarico_id) && t.push({
                tipo: "doppio",
                testo: `${i(C.persona_id)} fa ${a.etichetta(C.incarico_id)} a tutte e due le adunanze.`,
                settimana_id: d.id,
                persone: [C.persona_id]
            });
            for (let C of S) {
                let b = z.find(P => P.incarico_id === C)?.persona_id,
                    U = A.find(P => P.incarico_id === C)?.persona_id;
                b && U && b !== U && t.push({
                    tipo: "coordinatore",
                    testo: `Coordinatore uscieri diverso nella stessa settimana: ${i(b)} e ${i(U)}.`,
                    settimana_id: d.id,
                    persone: [b, U]
                })
            }
        }
        let m = new Map;
        for (let d of u) m.set(`${d.persona_id}|${d.incarico_id}`, (m.get(`${d.persona_id}|${d.incarico_id}`) ?? 0) + 1);
        for (let [d, g] of m)
            if (g > 2) {
                let [z, A] = d.split("|");
                t.push({
                    tipo: "ripetuto",
                    testo: `${i(z)} fa ${a.etichetta(A)} ${g} volte nel mese.`,
                    persone: [z]
                })
            } return t
    }

var wl = [{
            id: "USCIERI",
            codice: "USCIERI",
            nome: "Uscieri",
            ordine: 1,
            attivo: !0
        }, {
            id: "AUDIO_VIDEO",
            codice: "AUDIO_VIDEO",
            nome: "Audio/Video",
            ordine: 2,
            attivo: !0
        }, {
            id: "LETTERATURA",
            codice: "LETTERATURA",
            nome: "Letteratura",
            ordine: 3,
            attivo: !0
        }, {
            id: "TERRITORI",
            codice: "TERRITORI",
            nome: "Territori",
            ordine: 4,
            attivo: !0
        }, {
            id: "PULIZIE",
            codice: "PULIZIE",
            nome: "Pulizie",
            ordine: 5,
            attivo: !0
        }];
var Rt = function (a, t, n, i, e, l, u) { return { id: a, reparto_id: t, codice: n, nome: i, ordine: e, posti: l, livello: u || 'ADUNANZA', attivo: !0 }; };
var vn = [Rt("USC_COORD", "USCIERI", "COORDINATORE", "Coordinatore", 1, 1), Rt("USC_ING", "USCIERI", "INGRESSO", "Ingresso", 2, 1), Rt("USC_AUD", "USCIERI", "AUDITORIUM", "Auditorium", 3, 2), Rt("USC_PAR", "USCIERI", "PARCHEGGIO", "Parcheggio", 4, 2), Rt("AV_POD", "AUDIO_VIDEO", "PODIO", "Podio", 1, 1), Rt("AV_MIC", "AUDIO_VIDEO", "MICROFONISTA", "Microfonista", 2, 2), Rt("AV_MIX", "AUDIO_VIDEO", "MIXER", "Addetto Mixer", 3, 1), Rt("AV_PC", "AUDIO_VIDEO", "PC", "PC", 4, 1), Rt("LET", "LETTERATURA", "ASSISTENTE", "Letteratura", 1, 1), Rt("TER", "TERRITORI", "ASSISTENTE", "Territori", 1, 1), Rt("PUL_COORD", "PULIZIE", "COORDINATORE", "Coordinatore pulizie", 1, 1, "SETTIMANA"), Rt("PUL_REF", "PULIZIE", "REFERENTE", "Referente", 2, 1, "SETTIMANA")];
var Hl = Bm(wl, vn);
G.MotoreReparti = {
  reparti: wl, incarichi: vn, posti: Hl, postiProposta: Hl.filter(function (a) { return a.reparto.codice !== 'PULIZIE'; }),
  classi: wm(wl, vn), eccezioni: qm(wl, vn), ritardo: Js,
  proponi: Xm, revisione: jm, problemi: Ym, candidati: Si, ostacoli: Ut, etichetta: $s,
};
})(window);
