 # INC summary
Dette er en slack bot som registrerer INCer med kategori og viser statistikk angående disse INCene.

## Deploye ny versjon av appen
Det er laget et CI/CD pipeline som automatisk bygger og deployer ved commit i main branchen. 
Hvis det er andre endringer som skal gjøres med appen kan dette gjøres via https://portal.azure.com/. 
Alle i team-pm-betaling skal ha fått tilgang til Landingzone sbu-public-incstats der endringer på appen og database kan gjøres.

## Database diagram 
Databasen er satt opp manuelt og har følgende tabeller: 

### Categories Table

| Column Name | Data Type   | Constraints          |
|-------------|-------------|-----------------------|
| id          | Integer     | Primary Key, Auto-Increment |
| name        | String      | Unique, Not Null      |

### Incs Table

| Column Name  | Data Type   | Constraints          |
|--------------|-------------|-----------------------|
| id           | Integer     | Primary Key, Auto-Increment |
| user_name    | String      |                       |
| text         | String      |                       |
| category     | String      |                       |
| dropdown_id  | String      | Unique, Not Null      |
