import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import type { UserEvent } from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setAuthToken } from '../api/client'
import { heute } from '../format/dates'
import { formatDate } from '../format/numbers'
import { demoUser, installFakeBackend, type FakeBackend } from '../test/fakeBackend'
import { renderLoggedIn } from '../test/renderApp'
import { setzeBreite, setzeBreiteZurueck, viewports } from '../test/viewport'

/**
 * Verwaltungsbereich für Administratoren (YOUNGOITV-460) am Gesamtsystem.
 *
 * Die Rolle wird über den Nachbau des Backends gesetzt und nicht im Frontend gemockt, damit der echte
 * Weg vom Login über `GET /users/me` bis zum sichtbaren Navigationseintrag läuft. Genau daran hängt
 * hier alles: die Verwaltung ist der erste Bereich, den ein Teil der Benutzer nie sehen darf.
 *
 * Zwei Prüfungen tragen mehr als die übrigen. Erstens die Dublettenprüfung: ein zweites Wertpapier mit
 * demselben Symbol endet im Backend in einem 500er, weil die eindeutige Spalte nicht abgefangen wird,
 * und der Test verlangt deshalb, dass gar keine Anfrage rausgeht. Der Nachbau antwortet an dieser
 * Stelle absichtlich ebenfalls mit 500, damit die Prüfung nicht gegen einen freundlicheren Server
 * getestet wird, als es ihn gibt. Zweitens die englischen Fehlertexte: sie dürfen an keiner Stelle in
 * der Oberfläche auftauchen.
 *
 * Das Datumsfeld wird mit `fireEvent.change` gesetzt. Ein `input type="date"` nimmt keine
 * Tastatureingabe aus `userEvent` an, wie schon im Backtest-Test.
 */

let backend: FakeBackend

beforeEach(() => {
  setAuthToken(null)
  backend = installFakeBackend()
})

afterEach(() => {
  backend.restore()
  setzeBreiteZurueck()
})

/** Meldet den Demo-Benutzer als Administrator an. Die Rolle muss vor dem Login stehen. */
async function alsAdmin(route = '/verwaltung') {
  backend.setRole(demoUser.username, 'ADMIN')
  return renderLoggedIn(route)
}

/**
 * Die Navigation der Desktop-Breite.
 *
 * Auf Mobile liegt sie in einem geschlossenen Drawer, den jsdom als verborgen führt und
 * `getByRole` deshalb übergeht. Die Frage, welche Einträge eine Rolle sieht, hat mit der
 * Bildschirmbreite nichts zu tun, also wird sie an der Breite geprüft, an der die Leiste offen steht.
 */
function navigation() {
  return within(screen.getByRole('navigation', { name: 'Hauptnavigation' }))
}

/** Der Dialog trägt dieselben Beschriftungen wie die Seite dahinter, deshalb gescoped. */
function dialog() {
  return within(screen.getByRole('dialog'))
}

async function waehle(user: UserEvent, feld: RegExp, option: string): Promise<void> {
  await user.click(screen.getByRole('combobox', { name: feld }))
  await user.click(screen.getByRole('option', { name: option }))
}

function anfragen(method: string, url: string) {
  return backend.requests.filter((request) => request.method === method && request.url === url)
}

describe('Zugang zur Verwaltung', () => {
  it('zeigt einem Admin den Eintrag in der Navigation', async () => {
    setzeBreite(viewports.desktop)
    await alsAdmin('/')

    expect(navigation().getByRole('link', { name: 'Verwaltung' })).toBeInTheDocument()
  })

  it('blendet den Eintrag für einen Privatanleger aus', async () => {
    setzeBreite(viewports.desktop)
    await renderLoggedIn('/')

    // Ausgeblendet, nicht ausgegraut: ein Eintrag, der nie zu öffnen ist, wäre eine Sackgasse.
    expect(navigation().queryByRole('link', { name: 'Verwaltung' })).toBeNull()
    expect(navigation().getByRole('link', { name: 'Konten' })).toBeInTheDocument()
  })

  it('leitet einen Privatanleger von der Verwaltung auf das Dashboard', async () => {
    await renderLoggedIn('/verwaltung')

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Verwaltung' })).toBeNull()
    // Der Guard greift vor dem Laden: die Seite fragt ihre Stammdaten nicht einmal an.
    expect(anfragen('GET', '/securities')).toHaveLength(0)
  })
})

describe('Wertpapiere verwalten', () => {
  it('listet die erfassten Wertpapiere nach Symbol sortiert', async () => {
    await alsAdmin()

    const tabelle = await screen.findByRole('table', { name: 'Wertpapiere' })
    const zellen = within(tabelle)
      .getAllByRole('row')
      .slice(1)
      .map((zeile) => within(zeile).getAllByRole('cell')[0]?.textContent)
    // Der Ausgangsbestand liegt unsortiert, die Reihenfolge kommt also vom Endpunkt.
    expect(zellen).toEqual(['AAPL', 'NESN', 'ZURN'])
    expect(within(tabelle).getByText('Nestlé SA')).toBeInTheDocument()
  })

  it('legt ein Wertpapier an und zeigt es ohne Neuladen in der Liste', async () => {
    const { user } = await alsAdmin()
    await screen.findByRole('table', { name: 'Wertpapiere' })

    await user.click(screen.getByRole('button', { name: 'Wertpapier anlegen' }))
    await user.type(dialog().getByLabelText(/^Symbol/), 'logi')
    await user.type(dialog().getByLabelText(/^Name/), 'Logitech International SA')
    await user.click(dialog().getByRole('button', { name: 'Anlegen' }))

    // Ohne das Verwerfen der Abfrage stünde das neue Wertpapier erst nach zehn Minuten in der Liste.
    expect(await screen.findByText('LOGI')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()

    const gesendet = anfragen('POST', '/securities')
    expect(gesendet).toHaveLength(1)
    expect(gesendet[0]?.body).toEqual({
      // Grossgeschrieben, sonst läge "logi" neben einem späteren "LOGI" in der Datenbank.
      symbol: 'LOGI',
      name: 'Logitech International SA',
      assetType: 'STOCK',
      tradingCurrency: 'CHF',
      // Leere Felder gehen als "nicht angegeben" raus, nicht als leerer Text.
      isin: null,
      exchangeCode: null,
      countryCode: null,
      sector: null,
      couponRate: null,
      maturityDate: null,
    })
  })

  it('weist ein doppeltes Symbol ab, ohne es zu senden', async () => {
    const { user } = await alsAdmin()
    await screen.findByRole('table', { name: 'Wertpapiere' })

    await user.click(screen.getByRole('button', { name: 'Wertpapier anlegen' }))
    // Kleingeschrieben eingegeben: die Prüfung darf sich davon nicht täuschen lassen.
    await user.type(dialog().getByLabelText(/^Symbol/), 'aapl')
    await user.type(dialog().getByLabelText(/^Name/), 'Apple Inc.')
    await user.click(dialog().getByRole('button', { name: 'Anlegen' }))

    expect(
      await screen.findByText('AAPL ist bereits erfasst. Ein Symbol darf nur einmal vorkommen.'),
    ).toBeInTheDocument()
    // Der Kern der Prüfung: das Backend würde daraus einen 500er machen, also darf nichts rausgehen.
    expect(anfragen('POST', '/securities')).toHaveLength(0)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('zeigt Zinssatz und Endfälligkeit nur für eine Anleihe und schickt beide mit', async () => {
    const { user } = await alsAdmin()
    await screen.findByRole('table', { name: 'Wertpapiere' })

    await user.click(screen.getByRole('button', { name: 'Wertpapier anlegen' }))
    expect(dialog().queryByLabelText(/^Zinssatz/)).toBeNull()

    await waehle(user, /^Anlageart/, 'BOND')
    await user.type(dialog().getByLabelText(/^Symbol/), 'EIDG27')
    await user.type(dialog().getByLabelText(/^Name/), 'Eidgenossenschaft 2027')
    await user.type(dialog().getByLabelText(/^Zinssatz/), '1.75')
    fireEvent.change(dialog().getByLabelText('Endfälligkeit'), { target: { value: '2030-06-30' } })
    await user.click(dialog().getByRole('button', { name: 'Anlegen' }))

    await waitFor(() => {
      expect(anfragen('POST', '/securities')).toHaveLength(1)
    })
    expect(anfragen('POST', '/securities')[0]?.body).toMatchObject({
      symbol: 'EIDG27',
      assetType: 'BOND',
      couponRate: 1.75,
      maturityDate: '2030-06-30',
    })
  })
})

describe('Wechselkurse verwalten', () => {
  /** Wechselt in den Bereich und wartet, bis das Kursfeld steht. */
  async function kursbereich(user: UserEvent): Promise<void> {
    await user.click(screen.getByRole('tab', { name: 'Wechselkurse' }))
    await screen.findByLabelText('Kurs')
  }

  it('sagt in Deutsch, wenn für das Paar kein Kurs erfasst ist', async () => {
    const { user } = await alsAdmin()
    await kursbereich(user)

    await user.click(screen.getByRole('button', { name: 'Nachsehen' }))

    expect(
      await screen.findByText('Für dieses Paar ist an diesem Tag und davor kein Kurs erfasst.'),
    ).toBeInTheDocument()
    // Das Backend meldet den fehlenden Kurs als 400er mit englischem Text, der nicht durchreichen darf.
    expect(screen.queryByText(/No FX rate available/)).toBeNull()
  })

  it('erfasst einen Kurs und findet ihn danach', async () => {
    const { user } = await alsAdmin()
    await kursbereich(user)

    await user.type(screen.getByLabelText('Kurs'), '0.94')
    await user.click(screen.getByRole('button', { name: 'Kurs erfassen' }))

    const stichtag = formatDate(heute())
    expect(
      await screen.findByText(`Kurs erfasst: 1 EUR = 0.94 CHF am ${stichtag}.`),
    ).toBeInTheDocument()
    expect(anfragen('POST', '/fx-rates')[0]?.body).toEqual({
      baseCurrency: 'EUR',
      quoteCurrency: 'CHF',
      rateDate: heute(),
      rate: 0.94,
    })

    await user.click(screen.getByRole('button', { name: 'Nachsehen' }))

    expect(await screen.findByText(`Erfasst: 1 EUR = 0.94 CHF am ${stichtag}.`)).toBeInTheDocument()
  })

  it('warnt, wenn nur ein älterer Kurs vorliegt, und nennt dessen Datum', async () => {
    backend.fxRates.push({
      id: 300,
      baseCurrency: 'EUR',
      quoteCurrency: 'CHF',
      rateDate: '2020-01-01',
      rate: 0.93,
    })
    const { user } = await alsAdmin()
    await kursbereich(user)

    await user.click(screen.getByRole('button', { name: 'Nachsehen' }))

    // Das Backend rechnet still mit dem älteren Kurs weiter. Genau das muss hier zu sehen sein.
    expect(
      await screen.findByText(
        'Für den Stichtag selbst liegt kein Kurs. Gerechnet wird mit dem vom 01.01.2020: 1 EUR = 0.93 CHF.',
      ),
    ).toBeInTheDocument()
  })

  it('meldet einen 403 als fehlende Administratorrolle und führt zurück', async () => {
    const { user } = await alsAdmin()
    await kursbereich(user)
    // Wie eine Rolle, die einem anderen Admin während der Sitzung entzogen wurde.
    backend.forceStatus('/fx-rates', 403)

    await user.type(screen.getByLabelText('Kurs'), '0.94')
    await user.click(screen.getByRole('button', { name: 'Kurs erfassen' }))

    // Der Text nennt die Rolle und nicht ein fremdes Portfolio: in der Verwaltung wäre das falsch.
    expect(
      await screen.findByText('Kein Zugriff auf die Verwaltung. Dafür braucht es die Administratorrolle.'),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'Verwaltung' })).toBeNull()
    })
  })
})

describe('Rollen verwalten', () => {
  async function rollenbereich(user: UserEvent): Promise<void> {
    await user.click(screen.getByRole('tab', { name: 'Rollen' }))
    await screen.findByLabelText(/^Benutzernummer/)
  }

  it('setzt die Rolle über die Benutzernummer und nennt den betroffenen Namen', async () => {
    const { user } = await alsAdmin()
    const wanda = backend.addUser('wanda', 'PRIVATANLEGER')
    await rollenbereich(user)

    await user.type(screen.getByLabelText(/^Benutzernummer/), String(wanda.id))
    await user.click(screen.getByRole('button', { name: 'Rolle setzen' }))

    // Der Name in der Antwort ist die einzige Kontrolle, ob die getippte Nummer die richtige war:
    // eine Benutzersuche hat das Backend nicht.
    expect(
      await screen.findByText(`wanda (Nummer ${wanda.id}) hat jetzt die Rolle MANAGER.`),
    ).toBeInTheDocument()
    const gesendet = anfragen('PATCH', `/users/${wanda.id}/role`)
    expect(gesendet).toHaveLength(1)
    expect(gesendet[0]?.body).toEqual({ role: 'MANAGER' })
  })

  it('nennt eine unbekannte Benutzernummer in Deutsch', async () => {
    const { user } = await alsAdmin()
    await rollenbereich(user)

    await user.type(screen.getByLabelText(/^Benutzernummer/), '999')
    await user.click(screen.getByRole('button', { name: 'Rolle setzen' }))

    expect(await screen.findByText('Es gibt keinen Benutzer mit dieser Nummer.')).toBeInTheDocument()
    expect(screen.queryByText(/User 999 not found/)).toBeNull()
  })

  it('sendet bei einer unlesbaren Nummer nichts', async () => {
    const { user } = await alsAdmin()
    await rollenbereich(user)

    await user.type(screen.getByLabelText(/^Benutzernummer/), 'wanda')
    await user.click(screen.getByRole('button', { name: 'Rolle setzen' }))

    expect(
      await screen.findByText('Bitte eine Benutzernummer eingeben, eine ganze Zahl grösser als 0.'),
    ).toBeInTheDocument()
    expect(backend.requests.some((request) => request.method === 'PATCH')).toBe(false)
  })

  it('sagt deutlich, wenn die Änderung das eigene Konto trifft', async () => {
    const { user } = await alsAdmin()
    const admin = backend.users.find((kandidat) => kandidat.username === demoUser.username)
    expect(admin).toBeDefined()
    await rollenbereich(user)

    await user.type(screen.getByLabelText(/^Benutzernummer/), String(admin?.id))
    await waehle(user, /^Neue Rolle/, 'PRIVATANLEGER')
    await user.click(screen.getByRole('button', { name: 'Rolle setzen' }))

    // Verhindern kann die Oberfläche das nicht: die eigene Nummer kennt sie nicht, `GET /users/me`
    // liefert nur Name und Rolle. Sie muss es also hinterher sagen.
    expect(
      await screen.findByText(
        'Das war das eigene Konto. Die Rolle steht jetzt auf PRIVATANLEGER; nach dem nächsten Anmelden gilt sie auch hier.',
      ),
    ).toBeInTheDocument()
  })
})
