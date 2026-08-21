import numpy as np

unis = [x for x in """Braunschweig Braunschweig Braunschweig Braunschweig Münster Münster Münster Münster Dortmund Dortmund Dortmund Dortmund Berlin Berlin Hannover Hannover Stuttgart Stuttgart Stuttgart Kiel Kiel  Kiel  Kiel  Karlsruhe Bochum Münster Münster Münster Karlsruhe Wuppertal Wuppertal Wuppertal""".split(" ") if len(x) > 0]
personen = [f"Person {i}" for i in range(len(unis))]

alle_personen_nach_unis = {}

for uni, person in zip(unis, personen):
    if uni not in alle_personen_nach_unis:
        alle_personen_nach_unis[uni] = []
    alle_personen_nach_unis[uni].append(person)

teamgroesse = 5

# Aufrunden für Teamzahl
anzahl_teams = int(np.ceil(len(personen)/teamgroesse))

unis_sortiert_nach_personenzahl = list(reversed(list(sorted(alle_personen_nach_unis, key=lambda k: len(alle_personen_nach_unis[k])))))

# Leere Teamliste
teams_nach_uni = []
for i in range(anzahl_teams):
    teams_nach_uni.append([])

# Teamliste aufbauen: Von Unis mit meisten Einträgen zu Unis mit wenigen Einträgen
for uni in unis_sortiert_nach_personenzahl:
    menge_personen_in_uni = len(alle_personen_nach_unis[uni])
    verbleibende_personen = alle_personen_nach_unis[uni]
    np.random.shuffle(verbleibende_personen)
    while len(verbleibende_personen) > 0:
        noch_freie_teams = [i for i, arr in enumerate(teams_nach_uni) if len(arr) < teamgroesse]
        zu_verteilende_personen_menge = min(len(noch_freie_teams), len(verbleibende_personen))
        zu_verteilende_personen = verbleibende_personen[:zu_verteilende_personen_menge]
        verbleibende_personen = verbleibende_personen[zu_verteilende_personen_menge:]
        gewaehlte_teams = np.random.choice(noch_freie_teams, size=zu_verteilende_personen_menge, replace=False)
        for team, person in zip(gewaehlte_teams, zu_verteilende_personen):
            teams_nach_uni[team] += [(uni, person, "direkt")]

for team in teams_nach_uni:
    while len(team) < teamgroesse:
        team_unis = [uni for uni, person, art in team]
        neue_person = np.random.randint(len(personen))
        if unis[neue_person] in team_unis:
            continue
        team += [(unis[neue_person], personen[neue_person], "aufgefuellt")]

print(teams_nach_uni)