# Coop faktooringu demo

Eestikeelne faktooringu prototüüp panga, kaupmehe ja ostja vaatega.

[Ava avalik demo](https://hendrikroosna-netizen.github.io/coop-factoring-demo/)

Tehingud, saldod, riskihinnangud ja AI väljundid on sünteetilised näited. AI abifunktsioonid on märgitud „Simuleeritud AI”; päris AI-mudelit, panga API-t ega muid taustateenuseid ei kutsuta. Näidisdokumente ei laadita üles ja päringumustandeid ei saadeta välja. Ettevõtete nimed ja logod annavad esitlusel konteksti.

## Kohalik käivitamine

Vajalik on **Node.js 24** ja npm. Rakendus kasutab Reacti, TypeScripti ja Vite'i.

```sh
npm ci
npm run dev
```

Arendusserver avaneb aadressil `http://localhost:3000`.

```sh
npm run build
npm test
```

`build` kontrollib TypeScripti ja loob staatilise saidi kausta `dist/`. `test` kontrollib finantsarvestust ja AI töövoogude olekureegleid. Valmis paketti saab kohapeal vaadata käsuga `npm run preview`.

## Neli AI näidisvoogu

1. **Otsustusabi:** Coop Pank → Portfell → ava GTC Constructions. Vaata AI soovitust ja selle aluseid, koosta muudetav otsuse mustand ning salvesta või esita inimese ülevaatusele. Viru Raudteede toimik näitab puuduliku info juhtumit: riskihinnangu asemel pakutakse lisainfo päringut. Mustand ei muuda kehtivat limiiti ega piiranguid.
2. **Arve ettevalmistus:** Bauhof Group → Arved → ARV-2026-04490. Lisa näidisdokument ja saada tõend kontrolli. Seejärel Coop Pank → Nõuded ja laekumised → Kaupmehe esitatud tarnetõendid: märgi kontroll tehtuks, vali kinnitaja ja kinnita E2 tase. Dokumendi lisamine ega kinnitamine ei käivita finantseerimist.
3. **Laekumise jaotus:** Coop Pank → Nõuded ja laekumised → AI laekumiste jaotus. Vaata GTC 10 000 € näidislaekumise ettepanekut, muuda vajadusel jaotust, kontrolli mõju saldodele ning vali kinnitaja. Alles „Kinnita jaotus” uuendab arvejääke, limiidikasutust ja auditi jälge; osaline makse jätab jäägi avatuks.
4. **Kasvuvõimalus:** Bauhof Group → Ärikliendihaldur → Minu kliendid või Maksa hiljem. Ava AI soovitatud pakkumise mustand, vali olemasolevas vormis 45 või 60 päeva ja kontrolli tasu. „Paku” loob pakkumise, mida saab GTC Constructions → Kliendiportaal vaates aktsepteerida. Soovitus kasutab praegust vaba limiiti ja viivitust; see ei suurenda limiiti ega väida kontrollimata makseajalugu.

## Salvestamine ja uus esitlus

Arved, salvestatud AI memod, tõendite olekud, pakkumised, maksete jaotused ning audit säilivad selle brauseri `localStorage`-is. Lehe värskendamine neid ei lähtesta. Rollivalikud salvestatakse eraldi; salvestamata tekstiväljad ja ajutised vormivalikud ei pruugi säilida.

Puhta näidisvoo alustamiseks vali **Coop Pank → Auditi jälg → Uus sessioon — lähtesta demoseis**. See taastab tehingute algseisu ja lisab lähtestamise auditi kirje; rollivalikud säilivad. Laekumise jaotus võib muuta kasvusoovitusi, seega lähtesta demo, kui soovid vooge üksteisest sõltumatult esitleda. Avalikul saidil ja kohalikul serveril on eraldi brauseriseis; teiste kasutajate tegevus sinu näidet ei muuda.
