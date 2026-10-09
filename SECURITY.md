# Sicurezza

Capolinea tiene dati personali e finanziari, quindi le segnalazioni di sicurezza sono benvenute.

## Come segnalare un problema

Non aprire una issue pubblica. Usa invece la segnalazione privata di GitHub: **Security › Report a vulnerability** nella pagina del repository.

Scrivi:

- cosa hai trovato;
- come riprodurlo;
- quale versione dell'app hai usato (Profilo › Info).

Rispondo appena possibile. Lo faccio nel tempo libero, quindi non posso garantire tempi precisi.

## Cosa rientra

- Dati che escono dal telefono o che restano leggibili fuori dall'app:
  - il database;
  - le esportazioni;
  - le notifiche con la privacy attiva.
- Modi di aggirare il PIN, l'attesa dopo i tentativi sbagliati o «Copri l'anteprima».
- Backup costruiti apposta che, ripristinati, rompono l'app o i dati.

Il database **non è cifrato in Expo Go**, che serve solo per lo sviluppo: non è un problema di sicurezza dell'app installata.
