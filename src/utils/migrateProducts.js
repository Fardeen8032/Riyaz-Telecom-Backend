import "dotenv/config";
import mongoose from "mongoose";

const migrateProducts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("MongoDB connected");

    const db = mongoose.connection.db;
    const productsCollection = db.collection("products");

    const products = await productsCollection
      .find({})
      .toArray();

    console.log(`Found ${products.length} products`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const product of products) {
      if (product.images) {
        skippedCount++;
        continue;
      }

      const images = product.image
        ? [product.image]
        : [];

      await productsCollection.updateOne(
        { _id: product._id },
        {
          $set: {
            images,
          },
          $unset: {
            image: "",
            stock: "",
          },
        }
      );

      migratedCount++;
    }

    console.log(`Migrated: ${migratedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log("Product migration completed successfully");
  } catch (error) {
    console.error(
      "Product migration failed:",
      error
    );

    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    console.log("MongoDB disconnected");
  }
};

migrateProducts();