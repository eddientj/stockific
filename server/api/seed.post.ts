/**
 * POST /api/seed
 * Seeds the database with 100 mock products for development/testing.
 * Only works in non-production environments.
 */
export default defineEventHandler(async () => {
  if (process.env.NODE_ENV === 'production')
    throw createError({ statusCode: 403, statusMessage: 'Seeding not allowed in production' })

  const supabase = useSupabaseAdmin()

  // ── 1. Upsert categories ──────────────────────────────────
  const categoryNames = [
    'Pokémon', 'Magic: The Gathering', 'Yu-Gi-Oh!',
    'One Piece TCG', 'Dragon Ball Super', 'Accessories',
  ]

  const { data: cats, error: catErr } = await supabase
    .from('categories')
    .upsert(categoryNames.map(name => ({ name })), { onConflict: 'name', ignoreDuplicates: false })
    .select('id, name')

  if (catErr) throw createError({ statusCode: 500, statusMessage: catErr.message })

  const catMap = Object.fromEntries((cats ?? []).map(c => [c.name, c.id]))

  // ── 2. Build product definitions ─────────────────────────
  type ProductDef = {
    name: string; description: string; category: string
    price: number; is_active: boolean; stock: number; on_hold: number
  }

  const products: ProductDef[] = [
    // ── Pokémon (22) ───────────────────────────────────────
    { name: 'Scarlet & Violet Booster Pack',        category: 'Pokémon', price: 18.90,  is_active: true,  stock: 120, on_hold: 5,  description: '10 cards per pack from the Scarlet & Violet base set.' },
    { name: 'Paldean Fates Elite Trainer Box',       category: 'Pokémon', price: 249.90, is_active: true,  stock: 18,  on_hold: 2,  description: 'Includes 9 Paldean Fates booster packs and accessories.' },
    { name: 'Charizard ex Premium Collection',       category: 'Pokémon', price: 189.90, is_active: true,  stock: 12,  on_hold: 3,  description: 'Features promo Charizard ex and booster packs.' },
    { name: 'Obsidian Flames Booster Box',           category: 'Pokémon', price: 459.90, is_active: true,  stock: 8,   on_hold: 1,  description: '36 booster packs from the Obsidian Flames set.' },
    { name: 'Paradox Rift Booster Pack',             category: 'Pokémon', price: 18.90,  is_active: true,  stock: 95,  on_hold: 0,  description: '10 cards per pack from the Paradox Rift set.' },
    { name: 'Pikachu VMAX Rainbow Rare',             category: 'Pokémon', price: 320.00, is_active: true,  stock: 3,   on_hold: 1,  description: 'Single card — Pikachu VMAX Rainbow Rare from Vivid Voltage.' },
    { name: 'Mewtwo V Alternate Art',                category: 'Pokémon', price: 180.00, is_active: true,  stock: 5,   on_hold: 0,  description: 'Single card — Mewtwo V Alt Art from Pokemon GO set.' },
    { name: '151 Booster Pack',                      category: 'Pokémon', price: 22.90,  is_active: true,  stock: 200, on_hold: 10, description: 'The classic 151 Pokémon set, 10 cards per pack.' },
    { name: 'Mew ex Premium Collection',             category: 'Pokémon', price: 149.90, is_active: true,  stock: 25,  on_hold: 2,  description: 'Includes Mew ex promo and 4 booster packs.' },
    { name: 'Temporal Forces Booster Box',           category: 'Pokémon', price: 479.90, is_active: true,  stock: 6,   on_hold: 2,  description: '36 booster packs from the Temporal Forces set.' },
    { name: 'Gardevoir ex Deck',                     category: 'Pokémon', price: 59.90,  is_active: true,  stock: 30,  on_hold: 0,  description: 'Ready-to-play 60-card Gardevoir ex theme deck.' },
    { name: 'Iron Valiant ex Deck',                  category: 'Pokémon', price: 59.90,  is_active: false, stock: 0,   on_hold: 0,  description: 'Paradox Rift Iron Valiant ex theme deck.' },
    { name: 'Paldea Evolved Booster Pack',           category: 'Pokémon', price: 18.90,  is_active: true,  stock: 60,  on_hold: 3,  description: '10 cards per pack from the Paldea Evolved set.' },
    { name: 'Crown Zenith Galarian Gallery',         category: 'Pokémon', price: 28.90,  is_active: true,  stock: 40,  on_hold: 0,  description: 'Special subset booster featuring Galarian Gallery cards.' },
    { name: 'Arcanine ex Alt Art',                   category: 'Pokémon', price: 95.00,  is_active: true,  stock: 7,   on_hold: 1,  description: 'Single card — Arcanine ex Alt Art from Obsidian Flames.' },
    { name: 'Lost Origin Booster Pack',              category: 'Pokémon', price: 18.90,  is_active: true,  stock: 80,  on_hold: 0,  description: '10 cards per pack from Lost Origin.' },
    { name: 'Miraidon ex League Battle Deck',        category: 'Pokémon', price: 89.90,  is_active: true,  stock: 15,  on_hold: 0,  description: 'Competitive 60-card deck featuring Miraidon ex.' },
    { name: 'Koraidon ex League Battle Deck',        category: 'Pokémon', price: 89.90,  is_active: true,  stock: 14,  on_hold: 0,  description: 'Competitive 60-card deck featuring Koraidon ex.' },
    { name: '151 Ultra-Premium Collection',          category: 'Pokémon', price: 599.90, is_active: true,  stock: 4,   on_hold: 1,  description: 'Premium 151 collection with 16 packs, coins, and sleeves.' },
    { name: 'Surging Sparks Booster Pack',           category: 'Pokémon', price: 19.90,  is_active: true,  stock: 150, on_hold: 8,  description: '10 cards per pack from the Surging Sparks set.' },
    { name: 'Twilight Masquerade Booster Box',       category: 'Pokémon', price: 469.90, is_active: true,  stock: 5,   on_hold: 0,  description: '36 booster packs from Twilight Masquerade.' },
    { name: 'Charizard VSTAR Rainbow',               category: 'Pokémon', price: 250.00, is_active: true,  stock: 4,   on_hold: 2,  description: 'Single card — Charizard VSTAR Rainbow Rare from BRS.' },

    // ── Magic: The Gathering (18) ──────────────────────────
    { name: 'Bloomburrow Draft Booster Pack',        category: 'Magic: The Gathering', price: 22.90,  is_active: true,  stock: 90,  on_hold: 0,  description: '15 cards per pack from the Bloomburrow set.' },
    { name: 'Bloomburrow Play Booster Box',          category: 'Magic: The Gathering', price: 459.90, is_active: true,  stock: 9,   on_hold: 1,  description: '36 Play Booster packs from Bloomburrow.' },
    { name: 'Outlaws of Thunder Junction Bundle',    category: 'Magic: The Gathering', price: 179.90, is_active: true,  stock: 22,  on_hold: 0,  description: 'Includes 9 Play Booster packs and accessories.' },
    { name: 'Modern Horizons 3 Play Booster',        category: 'Magic: The Gathering', price: 45.90,  is_active: true,  stock: 35,  on_hold: 5,  description: 'High-powered Modern Horizons 3 booster pack.' },
    { name: 'Murders at Karlov Manor Commander Deck',category: 'Magic: The Gathering', price: 149.90, is_active: true,  stock: 18,  on_hold: 0,  description: 'Ready-to-play 100-card Commander deck.' },
    { name: 'Duskmourn Booster Pack',                category: 'Magic: The Gathering', price: 22.90,  is_active: true,  stock: 110, on_hold: 4,  description: '14 cards per pack from Duskmourn: House of Horror.' },
    { name: 'Orcish Bowmasters (LTR)',               category: 'Magic: The Gathering', price: 180.00, is_active: true,  stock: 8,   on_hold: 2,  description: 'Single card — competitive staple from LOTR Tales.' },
    { name: 'The One Ring (LTR)',                    category: 'Magic: The Gathering', price: 220.00, is_active: true,  stock: 3,   on_hold: 0,  description: 'Single card — The One Ring from LOTR Tales.' },
    { name: 'Innistrad Midnight Hunt Draft Booster', category: 'Magic: The Gathering', price: 18.90,  is_active: true,  stock: 50,  on_hold: 0,  description: '15 cards per pack from Innistrad: Midnight Hunt.' },
    { name: 'Collector Booster Duskmourn',           category: 'Magic: The Gathering', price: 65.90,  is_active: true,  stock: 28,  on_hold: 3,  description: 'Premium 15-card Collector Booster from Duskmourn.' },
    { name: 'Fallout Commander Deck – Mutant Menace',category: 'Magic: The Gathering', price: 159.90, is_active: true,  stock: 11,  on_hold: 0,  description: 'Fallout-themed Commander deck.' },
    { name: 'Cavern of Souls (LCI)',                 category: 'Magic: The Gathering', price: 290.00, is_active: true,  stock: 6,   on_hold: 1,  description: 'Single card — Cavern of Souls reprint from LCI.' },
    { name: 'Doctor Who Commander Deck',             category: 'Magic: The Gathering', price: 169.90, is_active: false, stock: 0,   on_hold: 0,  description: 'Universes Beyond Doctor Who Commander deck.' },
    { name: 'MH3 Eldrazi Incursion Commander Deck',  category: 'Magic: The Gathering', price: 159.90, is_active: true,  stock: 14,  on_hold: 0,  description: 'Modern Horizons 3 Commander deck.' },
    { name: 'Foundations Starter Kit',               category: 'Magic: The Gathering', price: 49.90,  is_active: true,  stock: 40,  on_hold: 0,  description: 'Two ready-to-play decks for new players.' },
    { name: 'Bloomburrow Commander Deck',            category: 'Magic: The Gathering', price: 149.90, is_active: true,  stock: 20,  on_hold: 2,  description: 'Bloomburrow-themed 100-card Commander deck.' },
    { name: 'Nadu Winged Wisdom (MH3)',              category: 'Magic: The Gathering', price: 75.00,  is_active: true,  stock: 12,  on_hold: 0,  description: 'Single card — Nadu Winged Wisdom from MH3.' },
    { name: 'Ulamog the Defiler (MH3)',              category: 'Magic: The Gathering', price: 95.00,  is_active: true,  stock: 9,   on_hold: 1,  description: 'Single card — Ulamog from Modern Horizons 3.' },

    // ── Yu-Gi-Oh! (18) ────────────────────────────────────
    { name: 'Phantom Nightmare Booster Box',         category: 'Yu-Gi-Oh!', price: 299.90, is_active: true,  stock: 10,  on_hold: 1,  description: '24 packs per box from the Phantom Nightmare set.' },
    { name: 'Rage of the Abyss Booster Pack',        category: 'Yu-Gi-Oh!', price: 14.90,  is_active: true,  stock: 80,  on_hold: 0,  description: '9 cards per pack, Rage of the Abyss set.' },
    { name: 'Legacy of Destruction Booster Box',     category: 'Yu-Gi-Oh!', price: 289.90, is_active: true,  stock: 8,   on_hold: 2,  description: '24 packs per box from Legacy of Destruction.' },
    { name: 'Snake-Eye Ash Secret Rare',             category: 'Yu-Gi-Oh!', price: 45.00,  is_active: true,  stock: 15,  on_hold: 0,  description: 'Single card — Snake-Eye Ash Secret Rare.' },
    { name: 'Wanted: Seeker of Sinful Spoils',       category: 'Yu-Gi-Oh!', price: 35.00,  is_active: true,  stock: 20,  on_hold: 0,  description: 'Single card — Super Rare Quick-Play Spell.' },
    { name: 'Infinite Forbidden Booster Pack',       category: 'Yu-Gi-Oh!', price: 14.90,  is_active: true,  stock: 65,  on_hold: 0,  description: '9 cards per pack from Infinite Forbidden.' },
    { name: 'Structure Deck: Fire Kings',            category: 'Yu-Gi-Oh!', price: 59.90,  is_active: true,  stock: 25,  on_hold: 0,  description: '43-card structure deck for Fire King archetype.' },
    { name: 'Maze of Millennia Booster Pack',        category: 'Yu-Gi-Oh!', price: 14.90,  is_active: true,  stock: 55,  on_hold: 3,  description: '9 cards per pack from Maze of Millennia.' },
    { name: 'Diabellstar the Black Witch UR',        category: 'Yu-Gi-Oh!', price: 28.00,  is_active: true,  stock: 18,  on_hold: 0,  description: 'Single card — Diabellstar the Black Witch Ultra Rare.' },
    { name: '25th Anniversary Rarity Collection II', category: 'Yu-Gi-Oh!', price: 22.90,  is_active: true,  stock: 45,  on_hold: 5,  description: 'Special anniversary reprint booster pack.' },
    { name: 'Age of Overlord Booster Box',           category: 'Yu-Gi-Oh!', price: 279.90, is_active: true,  stock: 7,   on_hold: 0,  description: '24 packs per box from Age of Overlord.' },
    { name: 'Tenpai Dragon Chundra SR',              category: 'Yu-Gi-Oh!', price: 12.00,  is_active: true,  stock: 30,  on_hold: 0,  description: 'Single card — Tenpai Dragon Chundra Super Rare.' },
    { name: 'Dark Magician Girl Quarter Century',    category: 'Yu-Gi-Oh!', price: 380.00, is_active: true,  stock: 2,   on_hold: 1,  description: 'Single card — Dark Magician Girl QCR reprint.' },
    { name: 'Structure Deck: Soulburner',            category: 'Yu-Gi-Oh!', price: 59.90,  is_active: false, stock: 0,   on_hold: 0,  description: 'Salamangreat structure deck, discontinued.' },
    { name: 'Albaz Strike Structure Deck',           category: 'Yu-Gi-Oh!', price: 59.90,  is_active: true,  stock: 22,  on_hold: 0,  description: 'Branded/Despia 43-card structure deck.' },
    { name: 'Borrelsword Dragon Secret',             category: 'Yu-Gi-Oh!', price: 55.00,  is_active: true,  stock: 6,   on_hold: 0,  description: 'Single card — Borrelsword Dragon Secret Rare.' },
    { name: 'Lightning Storm Secret Rare',           category: 'Yu-Gi-Oh!', price: 68.00,  is_active: true,  stock: 9,   on_hold: 1,  description: 'Single card — Lightning Storm competitive staple.' },
    { name: 'The Bystials SR Playset',               category: 'Yu-Gi-Oh!', price: 89.90,  is_active: true,  stock: 14,  on_hold: 0,  description: 'Playset of 3x Bystial Super Rare cards.' },

    // ── One Piece TCG (14) ────────────────────────────────
    { name: 'OP-07 Booster Pack (500 Years in the Future)', category: 'One Piece TCG', price: 19.90, is_active: true,  stock: 140, on_hold: 6,  description: '12 cards per pack from OP-07 set.' },
    { name: 'OP-07 Booster Box',                     category: 'One Piece TCG', price: 369.90, is_active: true,  stock: 11,  on_hold: 2,  description: '24 packs per box from OP-07.' },
    { name: 'Monkey D. Luffy SP Rare',               category: 'One Piece TCG', price: 120.00, is_active: true,  stock: 8,   on_hold: 1,  description: 'Single card — Luffy Special Rare card.' },
    { name: 'OP-06 Wings of the Captain Booster Box',category: 'One Piece TCG', price: 349.90, is_active: true,  stock: 6,   on_hold: 0,  description: '24 packs from OP-06.' },
    { name: 'Trafalgar Law Alternate Art',           category: 'One Piece TCG', price: 85.00,  is_active: true,  stock: 12,  on_hold: 0,  description: 'Single card — Trafalgar Law Alt Art Leader.' },
    { name: 'OP-05 Awakening of the New Era Box',    category: 'One Piece TCG', price: 339.90, is_active: true,  stock: 5,   on_hold: 1,  description: '24 packs from OP-05.' },
    { name: 'Yamato Super Rare',                     category: 'One Piece TCG', price: 65.00,  is_active: true,  stock: 10,  on_hold: 0,  description: 'Single card — Yamato Super Rare from OP-04.' },
    { name: 'Starter Deck: Straw Hat Crew',          category: 'One Piece TCG', price: 49.90,  is_active: true,  stock: 35,  on_hold: 0,  description: '51-card starter deck featuring the Straw Hats.' },
    { name: 'Starter Deck: Navy HQ',                 category: 'One Piece TCG', price: 49.90,  is_active: true,  stock: 28,  on_hold: 0,  description: '51-card starter deck for the Navy faction.' },
    { name: 'Uta Special Goods Set',                 category: 'One Piece TCG', price: 99.90,  is_active: false, stock: 0,   on_hold: 0,  description: 'Film Red promotional set, sold out.' },
    { name: 'Roronoa Zoro SEC',                      category: 'One Piece TCG', price: 110.00, is_active: true,  stock: 7,   on_hold: 2,  description: 'Single card — Zoro Secret Rare from OP-01.' },
    { name: 'OP-08 Two Legends Booster Pack',        category: 'One Piece TCG', price: 19.90,  is_active: true,  stock: 180, on_hold: 12, description: '12 cards per pack from OP-08 Two Legends.' },
    { name: 'OP-08 Two Legends Booster Box',         category: 'One Piece TCG', price: 379.90, is_active: true,  stock: 14,  on_hold: 3,  description: '24 packs per box from OP-08.' },
    { name: 'Nami Treasure Map Alt Art',             category: 'One Piece TCG', price: 55.00,  is_active: true,  stock: 11,  on_hold: 0,  description: 'Single card — Nami Alt Art Event card.' },

    // ── Dragon Ball Super (10) ────────────────────────────
    { name: 'DBS Fusion World Booster Pack',         category: 'Dragon Ball Super', price: 14.90, is_active: true,  stock: 90,  on_hold: 0,  description: '12 cards per pack from DBS Fusion World.' },
    { name: 'Awakened Pulse Booster Box',            category: 'Dragon Ball Super', price: 299.90, is_active: true,  stock: 10,  on_hold: 1,  description: '24 packs from FB01 Awakened Pulse.' },
    { name: 'Son Goku Leader Secret Rare',           category: 'Dragon Ball Super', price: 75.00,  is_active: true,  stock: 9,   on_hold: 0,  description: 'Single card — Son Goku Leader SR from FB01.' },
    { name: 'Blazing Aura Booster Box',              category: 'Dragon Ball Super', price: 289.90, is_active: true,  stock: 8,   on_hold: 0,  description: '24 packs from FB02 Blazing Aura.' },
    { name: 'Vegeta Super Rare Parallel',            category: 'Dragon Ball Super', price: 50.00,  is_active: true,  stock: 15,  on_hold: 0,  description: 'Single card — Vegeta SR Parallel from FB02.' },
    { name: 'Perfect Combination Booster Box',       category: 'Dragon Ball Super', price: 299.90, is_active: true,  stock: 7,   on_hold: 2,  description: '24 packs from FB03 Perfect Combination.' },
    { name: 'Starter Deck: Saiyan Showdown',         category: 'Dragon Ball Super', price: 49.90,  is_active: true,  stock: 20,  on_hold: 0,  description: 'Pre-built 50-card Saiyan deck.' },
    { name: 'Starter Deck: Namekian Surge',          category: 'Dragon Ball Super', price: 49.90,  is_active: true,  stock: 18,  on_hold: 0,  description: 'Pre-built 50-card Namekian deck.' },
    { name: 'Frieza Leader Gold Parallel',           category: 'Dragon Ball Super', price: 130.00, is_active: true,  stock: 4,   on_hold: 1,  description: 'Single card — Frieza Gold Parallel Leader.' },
    { name: 'Crimson Saiyan Booster Box',            category: 'Dragon Ball Super', price: 299.90, is_active: false, stock: 0,   on_hold: 0,  description: 'FB04 Crimson Saiyan — pre-order only.' },

    // ── Accessories (18) ──────────────────────────────────
    { name: 'Ultra Pro 9-Pocket Binder (Black)',     category: 'Accessories', price: 45.90,  is_active: true,  stock: 60,  on_hold: 0,  description: '9-pocket binder for 360 cards, black vinyl.' },
    { name: 'Dragon Shield Matte Sleeves (100)',      category: 'Accessories', price: 28.90,  is_active: true,  stock: 200, on_hold: 5,  description: '100 Dragon Shield matte sleeves — assorted colours.' },
    { name: 'KMC Perfect Hard Sleeves (100)',         category: 'Accessories', price: 22.90,  is_active: true,  stock: 150, on_hold: 0,  description: 'KMC Perfect Hard premium inner sleeves.' },
    { name: 'Ultimate Guard Quad Row Box',            category: 'Accessories', price: 89.90,  is_active: true,  stock: 35,  on_hold: 2,  description: 'Hard shell deck box holding 4 decks.' },
    { name: 'BCW Double Row Card Storage Box',        category: 'Accessories', price: 12.90,  is_active: true,  stock: 80,  on_hold: 0,  description: 'Long box for 800+ sleeved cards.' },
    { name: 'Pokemon Card Sleeve (65pk) – Pikachu',  category: 'Accessories', price: 19.90,  is_active: true,  stock: 95,  on_hold: 0,  description: 'Official Pokémon Pikachu card sleeves.' },
    { name: 'GG44 Magnetic One-Touch Case 35pt',     category: 'Accessories', price: 8.90,   is_active: true,  stock: 120, on_hold: 0,  description: 'Rigid magnetic card case for standard cards.' },
    { name: 'Playmat – Teal TCG Design',             category: 'Accessories', price: 59.90,  is_active: true,  stock: 40,  on_hold: 0,  description: 'Rubber non-slip 60×35cm playmat.' },
    { name: 'Card Dividers Set (100)',                category: 'Accessories', price: 15.90,  is_active: true,  stock: 70,  on_hold: 0,  description: 'Tabbed card dividers for binder or box organisation.' },
    { name: 'Dragon Shield Deck Box – Shadow Black',  category: 'Accessories', price: 24.90,  is_active: true,  stock: 55,  on_hold: 0,  description: 'Hard-shell deck box holding 80 sleeved cards.' },
    { name: 'Top Loader 3×4 (50pk)',                 category: 'Accessories', price: 18.90,  is_active: true,  stock: 200, on_hold: 0,  description: 'Standard 3×4 rigid top loaders, 50 per pack.' },
    { name: 'Ultra Pro One-Touch 100pt',             category: 'Accessories', price: 14.90,  is_active: true,  stock: 85,  on_hold: 0,  description: 'Magnetic one-touch display case for thick cards.' },
    { name: 'Pentalica Perfect Sleeves Clear (80)',  category: 'Accessories', price: 25.90,  is_active: true,  stock: 110, on_hold: 0,  description: 'Japanese perfect-fit sleeves, clear, 80pk.' },
    { name: 'Card Guard Inner Sleeves (100)',         category: 'Accessories', price: 9.90,   is_active: true,  stock: 180, on_hold: 0,  description: 'Basic inner sleeves, 100 per pack.' },
    { name: 'Monster Protectors Platinum Sleeves',   category: 'Accessories', price: 19.90,  is_active: true,  stock: 90,  on_hold: 0,  description: 'Platinum series clear sleeves, 100pk.' },
    { name: 'Playmat Tube – Aluminium',              category: 'Accessories', price: 39.90,  is_active: true,  stock: 30,  on_hold: 0,  description: 'Aluminium storage tube for rolled playmats.' },
    { name: 'Card Cleaning Kit',                     category: 'Accessories', price: 24.90,  is_active: true,  stock: 45,  on_hold: 0,  description: 'Microfibre cloth and spray for card maintenance.' },
    { name: 'Grading Submission Kit',                category: 'Accessories', price: 49.90,  is_active: true,  stock: 25,  on_hold: 0,  description: 'PSA/CGC submission starter kit with top loaders.' },
  ]

  // ── 3. Delete existing products + variants ────────────────
  await supabase.from('variants').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('products').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  // ── 4. Insert products ────────────────────────────────────
  const productRows = products.map(p => ({
    name:        p.name,
    description: p.description,
    price:       p.price,
    is_active:   p.is_active,
    category_id: catMap[p.category] ?? null,
    image_url:   null,
  }))

  const { data: insertedProducts, error: prodErr } = await supabase
    .from('products')
    .insert(productRows)
    .select('id')

  if (prodErr) throw createError({ statusCode: 500, statusMessage: prodErr.message })

  // ── 5. Insert variants ────────────────────────────────────
  const variantRows = (insertedProducts ?? []).map((p, i) => ({
    product_id:     p.id,
    name:           'Default',
    sku:            null,
    stock_quantity: products[i]!.stock,
    stock_on_hold:  products[i]!.on_hold,
    price_override: null,
  }))

  const { error: varErr } = await supabase.from('variants').insert(variantRows)
  if (varErr) throw createError({ statusCode: 500, statusMessage: varErr.message })

  return {
    ok: true,
    seeded: products.length,
    categories: categoryNames.length,
  }
})
