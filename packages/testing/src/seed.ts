import type { ZahlnSchemas } from '@zahln/api-client';

/**
 * The fake server's data, copied from Zahln's test server (`GET /mensas`,
 * recorded 2026-10-31): the same mensas, tills, menus and logins, so tests
 * read like the real thing.
 */
export type ApiMensa = ZahlnSchemas['schemas']['Mensa'];
export type ApiUser = ZahlnSchemas['schemas']['User'];

export const MENSAS: readonly ApiMensa[] = [
  {
    "id": "cafe_bibliothek",
    "name": "Cafeteria Bibliothek",
    "city": "Musterstadt",
    "tills": [
      {
        "id": "till_bibliothek_1",
        "name": "Kasse 1"
      }
    ],
    "menu": [
      {
        "id": "item_bibliothek_coffee",
        "name": {
          "de": "Kaffee",
          "en": "Coffee"
        },
        "prices": {
          "student": 110,
          "staff": 140,
          "guest": 170
        }
      },
      {
        "id": "item_bibliothek_cappuccino",
        "name": {
          "de": "Cappuccino",
          "en": "Cappuccino"
        },
        "prices": {
          "student": 160,
          "staff": 200,
          "guest": 240
        }
      },
      {
        "id": "item_bibliothek_roll",
        "name": {
          "de": "Belegtes Brötchen",
          "en": "Filled roll"
        },
        "prices": {
          "student": 190,
          "staff": 250,
          "guest": 290
        }
      },
      {
        "id": "item_bibliothek_soup",
        "name": {
          "de": "Suppe des Tages",
          "en": "Soup of the day"
        },
        "prices": {
          "student": 120,
          "staff": 200,
          "guest": 260
        }
      },
      {
        "id": "item_bibliothek_cake",
        "name": {
          "de": "Kuchen",
          "en": "Cake"
        },
        "prices": {
          "student": 130,
          "staff": 170,
          "guest": 210
        }
      },
      {
        "id": "item_bibliothek_spritzer",
        "name": {
          "de": "Apfelschorle 0,5 l",
          "en": "Apple spritzer 0.5 l"
        },
        "prices": {
          "student": 140,
          "staff": 170,
          "guest": 200
        }
      }
    ]
  },
  {
    "id": "mensa_campus",
    "name": "Mensa am Campus",
    "city": "Musterstadt",
    "tills": [
      {
        "id": "till_campus_1",
        "name": "Kasse 1"
      },
      {
        "id": "till_campus_2",
        "name": "Kasse 2"
      },
      {
        "id": "till_campus_3",
        "name": "Kasse 3"
      }
    ],
    "menu": [
      {
        "id": "item_campus_veggie",
        "name": {
          "de": "Tagesgericht vegetarisch",
          "en": "Vegetarian dish of the day"
        },
        "prices": {
          "student": 250,
          "staff": 420,
          "guest": 560
        }
      },
      {
        "id": "item_campus_meat",
        "name": {
          "de": "Tagesgericht mit Fleisch",
          "en": "Meat dish of the day"
        },
        "prices": {
          "student": 320,
          "staff": 510,
          "guest": 650
        }
      },
      {
        "id": "item_campus_pasta",
        "name": {
          "de": "Pasta mit Tomatensoße",
          "en": "Pasta with tomato sauce"
        },
        "prices": {
          "student": 220,
          "staff": 380,
          "guest": 490
        }
      },
      {
        "id": "item_campus_salad",
        "name": {
          "de": "Salatteller vom Buffet",
          "en": "Salad bar plate"
        },
        "prices": {
          "student": 180,
          "staff": 300,
          "guest": 390
        }
      },
      {
        "id": "item_campus_soup",
        "name": {
          "de": "Suppe des Tages",
          "en": "Soup of the day"
        },
        "prices": {
          "student": 120,
          "staff": 200,
          "guest": 260
        }
      },
      {
        "id": "item_campus_dessert",
        "name": {
          "de": "Dessert",
          "en": "Dessert"
        },
        "prices": {
          "student": 90,
          "staff": 140,
          "guest": 180
        }
      },
      {
        "id": "item_campus_spritzer",
        "name": {
          "de": "Apfelschorle 0,5 l",
          "en": "Apple spritzer 0.5 l"
        },
        "prices": {
          "student": 140,
          "staff": 170,
          "guest": 200
        }
      },
      {
        "id": "item_campus_coffee",
        "name": {
          "de": "Kaffee",
          "en": "Coffee"
        },
        "prices": {
          "student": 110,
          "staff": 140,
          "guest": 170
        }
      }
    ]
  },
  {
    "id": "mensa_nord",
    "name": "Mensa Nord",
    "city": "Musterstadt",
    "tills": [
      {
        "id": "till_nord_1",
        "name": "Kasse 1"
      },
      {
        "id": "till_nord_2",
        "name": "Kasse 2"
      }
    ],
    "menu": [
      {
        "id": "item_nord_veggie",
        "name": {
          "de": "Tagesgericht vegetarisch",
          "en": "Vegetarian dish of the day"
        },
        "prices": {
          "student": 250,
          "staff": 420,
          "guest": 560
        }
      },
      {
        "id": "item_nord_meat",
        "name": {
          "de": "Tagesgericht mit Fleisch",
          "en": "Meat dish of the day"
        },
        "prices": {
          "student": 320,
          "staff": 510,
          "guest": 650
        }
      },
      {
        "id": "item_nord_pasta",
        "name": {
          "de": "Pasta mit Tomatensoße",
          "en": "Pasta with tomato sauce"
        },
        "prices": {
          "student": 220,
          "staff": 380,
          "guest": 490
        }
      },
      {
        "id": "item_nord_salad",
        "name": {
          "de": "Salatteller vom Buffet",
          "en": "Salad bar plate"
        },
        "prices": {
          "student": 180,
          "staff": 300,
          "guest": 390
        }
      },
      {
        "id": "item_nord_soup",
        "name": {
          "de": "Suppe des Tages",
          "en": "Soup of the day"
        },
        "prices": {
          "student": 120,
          "staff": 200,
          "guest": 260
        }
      },
      {
        "id": "item_nord_dessert",
        "name": {
          "de": "Dessert",
          "en": "Dessert"
        },
        "prices": {
          "student": 90,
          "staff": 140,
          "guest": 180
        }
      },
      {
        "id": "item_nord_spritzer",
        "name": {
          "de": "Apfelschorle 0,5 l",
          "en": "Apple spritzer 0.5 l"
        },
        "prices": {
          "student": 140,
          "staff": 170,
          "guest": 200
        }
      },
      {
        "id": "item_nord_coffee",
        "name": {
          "de": "Kaffee",
          "en": "Coffee"
        },
        "prices": {
          "student": 110,
          "staff": 140,
          "guest": 170
        }
      }
    ]
  }
];

export const USERS: readonly ApiUser[] = [
  { id: 'usr_student', displayName: 'Test Student', role: 'student', priceGroup: 'student', tillId: null, mensaId: null },
  { id: 'usr_staff', displayName: 'Test Staff', role: 'staff', priceGroup: 'staff', tillId: null, mensaId: null },
  { id: 'usr_guest', displayName: 'Test Guest', role: 'guest', priceGroup: 'guest', tillId: null, mensaId: null },
  { id: 'usr_cashier_campus_1', displayName: 'Mensa am Campus, Kasse 1', role: 'cashier', priceGroup: null, tillId: 'till_campus_1', mensaId: 'mensa_campus' },
  { id: 'usr_cashier_campus_2', displayName: 'Mensa am Campus, Kasse 2', role: 'cashier', priceGroup: null, tillId: 'till_campus_2', mensaId: 'mensa_campus' },
  { id: 'usr_cashier_campus_3', displayName: 'Mensa am Campus, Kasse 3', role: 'cashier', priceGroup: null, tillId: 'till_campus_3', mensaId: 'mensa_campus' },
  { id: 'usr_cashier_nord_1', displayName: 'Mensa Nord, Kasse 1', role: 'cashier', priceGroup: null, tillId: 'till_nord_1', mensaId: 'mensa_nord' },
  { id: 'usr_cashier_nord_2', displayName: 'Mensa Nord, Kasse 2', role: 'cashier', priceGroup: null, tillId: 'till_nord_2', mensaId: 'mensa_nord' },
  { id: 'usr_cashier_bibliothek_1', displayName: 'Cafeteria Bibliothek, Kasse 1', role: 'cashier', priceGroup: null, tillId: 'till_bibliothek_1', mensaId: 'cafe_bibliothek' },
  { id: 'usr_finance', displayName: 'Studierendenwerk Finanzen', role: 'finance', priceGroup: null, tillId: null, mensaId: null },
];

/** Usernames as Zahln has them: `cashier-campus-1` is `usr_cashier_campus_1`. */
export const userIdFor = (username: string): string => `usr_${username.replace(/-/g, '_')}`;
