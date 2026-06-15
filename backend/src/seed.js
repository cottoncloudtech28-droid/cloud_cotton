require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");

const products = [
  {
    name: "Pink Sippy Bottle",
    description: "Adorable pink sippy bottles with cute character prints – perfect for little hands.",
    price: 999,
    discount_percent: 0,
    image_url: "https://jdgkrcxwdcfghqlacjai.supabase.co/storage/v1/object/public/products/pink-sippy-bottles.jpeg",
    category: "bottles",
    stock: 10,
    is_active: true,
    colors: ["Pink"],
  },
  {
    name: "Food Jars",
    description: "Cute cartoon character mini sippy bottles with carry strap.",
    price: 1199,
    discount_percent: 0,
    image_url: "https://jdgkrcxwdcfghqlacjai.supabase.co/storage/v1/object/public/products/crayon-character-bottles-v2.jpg",
    category: "bottles",
    stock: 30,
    is_active: true,
    colors: ["Blue Elephant", "Pink Spring", "Green Love", "Purple Pig"],
  },
  {
    name: "Happiness Puppy Sippy Bottle",
    description: null,
    price: 899,
    discount_percent: 0,
    image_url: null,
    category: "bottles",
    stock: 10,
    is_active: true,
    colors: ["Pink", "Red", "Yellow", "Blue"],
  },
  {
    name: "Rainbow Charm Notebook Set",
    description: "Set of 4 silicone pegboard notebooks with adorable charm decorations.",
    price: 499,
    discount_percent: 0,
    image_url: "https://jdgkrcxwdcfghqlacjai.supabase.co/storage/v1/object/public/products/notebooks-charm-set-v2.jpg",
    category: "stationery",
    stock: 20,
    is_active: true,
    colors: ["Pink", "Purple", "Tie-Dye", "Blue"],
  },
  {
    name: "Owala Insulated Bottle - Color Pop",
    description: "Spill-resistant vacuum insulated bottle with 2-in-1 lid.",
    price: 1499,
    discount_percent: 0,
    image_url: "https://jdgkrcxwdcfghqlacjai.supabase.co/storage/v1/object/public/products/owala-color-bottles-v2.jpg",
    category: "bottles",
    stock: 25,
    is_active: true,
    colors: ["Red", "Orange", "Mint", "Blue"],
  },
  {
    name: "HUNTR/X Style Tumbler",
    description: "Leakproof printed tumbler with carry handle, hot & cold for hours.",
    price: 1299,
    discount_percent: 0,
    image_url: "https://jdgkrcxwdcfghqlacjai.supabase.co/storage/v1/object/public/products/huntrx-tumblers-v2.jpg",
    category: "bottles",
    stock: 20,
    is_active: true,
    colors: ["White", "Blue", "Magenta", "Hot Pink", "Lavender"],
  },
  {
    name: "Stanley Aerolight Transit Mug",
    description: "Premium lightweight insulated transit mug, 16oz.",
    price: 1799,
    discount_percent: 0,
    image_url: "https://jdgkrcxwdcfghqlacjai.supabase.co/storage/v1/object/public/products/stanley-transit-mugs-v2.jpg",
    category: "bottles",
    stock: 18,
    is_active: true,
    colors: ["Blue", "Stone", "Cream", "Black", "Lilac", "Pink"],
  },
  {
    name: "Owala Patterned Water Bottle",
    description: "Leak-proof insulated bottle with built-in straw and cute patterns.",
    price: 1599,
    discount_percent: 0,
    image_url: "https://jdgkrcxwdcfghqlacjai.supabase.co/storage/v1/object/public/products/owala-pattern-bottles-v2.jpg",
    category: "bottles",
    stock: 22,
    is_active: true,
    colors: ["Hello Kitty Pink", "Cherry Blossom", "Bow White", "Daisy Green", "Black Rose", "Sticker Lavender"],
  },
  {
    name: "Number Blocks Learning Bottle",
    description: null,
    price: 1099,
    discount_percent: 0,
    image_url: null,
    category: "bottles",
    stock: 10,
    is_active: true,
    colors: ["Pink Bunny", "Green Frog"],
  },
  {
    name: "Mama & Baby Duck Toy Set",
    description: null,
    price: 599,
    discount_percent: 0,
    image_url: null,
    category: "toys",
    stock: 10,
    is_active: true,
    colors: ["White", "Yellow"],
  },
  {
    name: "LED Vanity Mirror with Drawers",
    description: null,
    price: 1899,
    discount_percent: 0,
    image_url: null,
    category: "quirky",
    stock: 10,
    is_active: true,
    colors: ["White"],
  },
  {
    name: "Owala Classic Insulated Tumbler",
    description: null,
    price: 1599,
    discount_percent: 0,
    image_url: null,
    category: "tumblers",
    stock: 10,
    is_active: true,
    colors: ["Red", "Orange", "Mint", "Navy"],
  },
  {
    name: "Owala Printed Hydration Bottle",
    description: null,
    price: 1699,
    discount_percent: 0,
    image_url: null,
    category: "bottles",
    stock: 10,
    is_active: true,
    colors: ["Hello Kitty Pink", "Cherry Blossom", "White Bow", "Green Daisy", "Black Rose", "Lilac Sticker"],
  },
  {
    name: "Stitch & Angel Character Tumbler",
    description: null,
    price: 1399,
    discount_percent: 0,
    image_url: null,
    category: "tumblers",
    stock: 10,
    is_active: true,
    colors: ["Stitch Blue", "Angel Pink"],
  },
  {
    name: "Best Cars Luxury Gift Box (48 pcs)",
    description: null,
    price: 1499,
    discount_percent: 0,
    image_url: null,
    category: "toys",
    stock: 10,
    is_active: true,
    colors: ["Assorted"],
  },
  {
    name: "Dazzling Spray Lightsaber Sword",
    description: null,
    price: 1799,
    discount_percent: 0,
    image_url: null,
    category: "toys",
    stock: 10,
    is_active: true,
    colors: ["Red/Silver"],
  },
  {
    name: "SCUP Insulated Food Jar",
    description: null,
    price: 1199,
    discount_percent: 0,
    image_url: null,
    category: "food jars",
    stock: 10,
    is_active: true,
    colors: ["Black", "White", "Mint", "Grey", "Red"],
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/kawaii-corner-shop");
  console.log("Connected to MongoDB");

  const existing = await Product.countDocuments();
  if (existing > 0) {
    console.log(`Found ${existing} existing products — clearing before re-seed...`);
    await Product.deleteMany({});
  }

  const inserted = await Product.insertMany(products);
  console.log(`Seeded ${inserted.length} products successfully.`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
