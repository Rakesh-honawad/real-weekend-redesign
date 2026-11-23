// Destinations and spots. Spend = rough on-ground weekend spend (stay, food, activities), excluding travel to the place.
// IMPORTANT: confirm this list against the goSTOPS city pages before launch. stays = confirmed goSTOPS URL slug, or null (opens the goSTOPS home page).
// d: slug|name|state|region|type|emoji|vibes|bestMonths|spendLow|spendHigh|suits|lat|lon|stays
export const places = [
 "rishikesh|Rishikesh|Uttarakhand|north|mountain|🌊|adventure,soul,chill|1,2,3,4,5,6,9,10,11,12|2500|5000|solo,friends|30.0869|78.2676|",
 "jaipur|Jaipur|Rajasthan|north|heritage|🏰|culture,chill|10,11,12,1,2,3|2500|5000|family,couple,friends|26.9124|75.7873|",
 "mcleodganj|McLeodganj|Himachal Pradesh|north|mountain|🏔️|chill,soul,adventure|3,4,5,6,9,10,11|2500|5500|solo,couple|32.2426|76.3213|mcleodganj",
 "manali|Manali|Himachal Pradesh|north|mountain|❄️|adventure,party,chill|3,4,5,6,10,11,12|3500|7000|friends,couple|32.2396|77.1887|",
 "bir|Bir|Himachal Pradesh|north|mountain|🪂|adventure,chill|3,4,5,6,9,10,11|2500|5500|solo,friends|32.0417|76.7195|",
 "varanasi|Varanasi|Uttar Pradesh|north|heritage|🪔|soul,culture|10,11,12,1,2,3|2000|4500|solo,family|25.3176|82.9739|",
 "goa|Goa|Goa|west|beach|🏖️|party,chill|11,12,1,2,3|3500|8000|friends,couple,solo|15.4909|73.8278|Goa",
 "alibaug|Alibaug|Maharashtra|west|beach|🐚|chill,party|10,11,12,1,2,3|3000|6000|friends,couple|18.6414|72.8722|alibaug",
 "pondicherry|Pondicherry|Puducherry|south|beach|🥐|chill,culture|10,11,12,1,2,3|2500|5500|couple,solo|11.9416|79.8083|",
 "coorg|Coorg|Karnataka|south|forest|☕|chill,adventure|9,10,11,12,1,2,3|2500|5500|friends,family,couple|12.4244|75.7382|",
 "chikmagalur|Chikmagalur|Karnataka|south|forest|⛰️|chill,adventure|9,10,11,12,1,2|2500|5000|friends,solo|13.3161|75.772|Chikmagalur",
 "ooty|Ooty|Tamil Nadu|south|mountain|🚂|chill,culture|3,4,5,6,9,10,11,12|2500|5500|family,couple|11.4102|76.695|"
]
// s: destination|name|category|travelMin(each way from stay)|durationMin|indoor(0/1)|suits|priority(1-3, editorial)
export const spots = [
 "rishikesh|Laxman Jhula walk|sight|20|60|0||2","rishikesh|Ganga aarti at Triveni Ghat|culture|25|75|0|solo,family|3","rishikesh|Rafting at Shivpuri|adventure|45|180|0|friends,solo|3","rishikesh|Beatles Ashram|sight|20|60|0|solo|1","rishikesh|Cafe hopping|food|10|90|1|solo,couple|2",
 "jaipur|Amer Fort|sight|30|150|0|family,couple|3","jaipur|Hawa Mahal and old city|sight|15|90|0||3","jaipur|Kachori and chai crawl|food|15|75|1|solo,friends|2","jaipur|City Palace|sight|15|90|1|family|2","jaipur|Nahargarh sunset|sight|35|90|0|couple,friends|1",
 "mcleodganj|Triund trek|adventure|40|300|0|friends,solo|3","mcleodganj|Bhagsu falls and cafes|sight|15|90|0|couple,solo|2","mcleodganj|Namgyal monastery|culture|10|60|0|solo,family|2","mcleodganj|Momo crawl|food|5|60|1|solo,friends|2","mcleodganj|Dal Lake|sight|20|45|0|family|1",
 "manali|Old Manali cafes|food|15|90|1|couple,friends|3","manali|Solang Valley|adventure|60|210|0|friends,couple|3","manali|Hadimba temple|sight|15|45|0|family|2","manali|Mall Road|sight|10|60|1|family|1",
 "bir|Paragliding at Billing|adventure|50|180|0|friends,solo|3","bir|Monastery visit|culture|15|60|0|solo,family|2","bir|Tea garden walk|sight|20|60|0|couple|1","bir|Cafe afternoon|food|5|90|1|solo,couple|2",
 "varanasi|Sunrise boat ride|culture|15|90|0|solo,couple|3","varanasi|Ghat walk|culture|10|90|0|solo|3","varanasi|Ganga aarti|culture|15|75|0|family,solo|3","varanasi|Kachori-jalebi breakfast|food|10|45|1|friends|2","varanasi|Sarnath|sight|40|120|0|family|1",
 "goa|Beach shacks|beach|20|150|0|friends,couple|3","goa|Scooter ride and sunset|adventure|30|120|0|couple,friends|3","goa|Panjim old town|sight|40|90|0|family,solo|2","goa|Flea or night market|shopping|25|90|1|friends|1",
 "alibaug|Kashid and Alibaug beach|beach|20|120|0|family,friends|3","alibaug|Kolaba Fort|sight|15|60|0|family|2","alibaug|Seafood lunch|food|10|75|1|friends,couple|2",
 "pondicherry|White Town on cycles|sight|10|120|0|solo,couple|3","pondicherry|French bakeries|food|10|60|1|solo,couple|2","pondicherry|Auroville|culture|25|120|0|solo,family|2","pondicherry|Paradise Beach|beach|30|90|0|friends|1",
 "coorg|Abbey Falls|sight|20|75|0|family,friends|3","coorg|Coffee estate walk|sight|25|90|0|couple,family|2","coorg|Dubare elephant camp|adventure|40|120|0|family|2","coorg|Raja's Seat sunrise|sight|10|60|0|couple,solo|2",
 "chikmagalur|Mullayanagiri sunrise trek|adventure|45|180|0|friends,solo|3","chikmagalur|Estate stay and walk|sight|20|90|0|couple|2","chikmagalur|Hebbe Falls|sight|50|120|0|friends|2","chikmagalur|Filter coffee stop|food|10|45|1|solo|1",
 "ooty|Toy train ride|sight|15|150|0|family,couple|3","ooty|Botanical Garden|sight|10|75|0|family|2","ooty|Ooty Lake and cafes|food|10|90|0|couple,friends|2","ooty|Doddabetta Peak|sight|30|60|0|friends|1"
]
