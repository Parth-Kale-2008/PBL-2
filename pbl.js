const btn = document.querySelector("button");
const questionInput = document.getElementById("question");
const outputBox = document.getElementById("output-box");

let localData = {};

fetch("data.json")
    .then(res => res.json())
    .then(data => {
        localData = data;
        console.log("Local data loaded:", localData);
    })
    .catch(err => console.error("Error loading local data:", err));

btn.addEventListener("click", async () => {
    const barcode = questionInput.value.trim();

    if (!barcode) {
        outputBox.innerHTML = '<p style="color:#ff6b6b;">Please enter the barcode number!</p>';
        return;
    }

    if (localData[barcode]) {
        const item = localData[barcode];

        outputBox.innerHTML = `
            <h3>${item.name}</h3>
            <p><strong>Allergens:</strong> ${item.allergens.length ? item.allergens.join(", ") : "None"}</p>
            <p><strong>Score:</strong> ${item.score}/10</p>
            <p><strong>Verdict:</strong> ${item.verdict}</p>
        `;
        return;
    }

    btn.disabled = true;
    btn.textContent = "Loading...";
    outputBox.innerHTML = '<p style="color:#a0a0a0;">Fetching product...</p>';

    try {
        const foodApi = `https://world.openfoodfacts.org/api/v0/product/${barcode}.json`;
        const foodResponse = await fetch(foodApi);
        const foodData = await foodResponse.json();

        console.log("Open Food Facts response:", foodData);

        if (foodData.status !== 1 || !foodData.product) {
            outputBox.innerHTML = `<p style="color:red;">Product not found.</p>`;
            return;
        }

        const product = foodData.product;
        const productName = product.product_name || product.product_name_en || "Unknown Product";
        const brand = product.brands || "Unknown Brand";

        let ingredients =
            product.ingredients_text ||
            product.ingredients_text_en ||
            "";

        if (!ingredients && Array.isArray(product.ingredients)) {
            ingredients = product.ingredients
                .map(item => item.text)
                .filter(Boolean)
                .join(", ");
        }

        if (!ingredients) {
            outputBox.innerHTML = `
                <h3>${productName}</h3>
                <p><strong>Brand:</strong> ${brand}</p>
                <p style="color:#ff6b6b;">Ingredients not available, so AI analysis cannot be done.</p>
            `;
            return;
        }

        outputBox.innerHTML = `
            <h3>${productName}</h3>
            <p><strong>Brand:</strong> ${brand}</p>
            <p><strong>Ingredients:</strong> ${ingredients}</p>
            <p style="color:#a0a0a0;">Analyzing ingredients...</p>
        `;

        const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

        const prompt = `
Analyze this packaged food product.

Product Name: ${productName}
Brand: ${brand}
Ingredients: ${ingredients}

Return ONLY valid JSON in this exact format:
{
    "allergens": ["item1", "item2"],
    "containsAllergen": true,
    "concerns": ["item1", "item2"],
    "score": 7,
    "verdict": "short final verdict"
}

Scoring Rules:
- Start from score = 10
- Subtract 2 for unhealthy oils
- Subtract 2 for high sugar/salt
- Subtract 2 for additives/preservatives
- Subtract 2 if allergens present
- Add 1-2 if natural

- Score must vary based on ingredients
- Score must be between 1 and 10

Rules:
- No markdown
- No extra text
`;

        const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENROUTER_API_KEY}`
            },
            body: JSON.stringify({
                model: "openai/gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                max_tokens: 300,
                response_format: { type: "json_object" }
            })
        });

        const aiData = await aiResponse.json();

        console.log("AI response:", aiData);

        const content = aiData?.choices?.[0]?.message?.content;

        if (!content) {
            outputBox.innerHTML = `
                <h3>${productName}</h3>
                <p><strong>Brand:</strong> ${brand}</p>
                <p><strong>Ingredients:</strong> ${ingredients}</p>
                <p style="color:red;">AI analysis failed. No response received.</p>
            `;
            return;
        }

        let result = JSON.parse(content);

        const allergens = result.allergens || [];
        const concerns = result.concerns || [];
        const score = result.score || "N/A";
        const verdict = result.verdict || "No verdict";

        outputBox.innerHTML = `
            <h3>${productName}</h3>
            <p><strong>Brand:</strong> ${brand}</p>
            <p><strong>Ingredients:</strong> ${ingredients}</p>
            <hr>
            <p><strong>Allergens:</strong> ${allergens.join(", ") || "None"}</p>
            <p><strong>Concerns:</strong> ${concerns.join(", ") || "None"}</p>
            <p><strong>Score:</strong> ${score}/10</p>
            <p><strong>Verdict:</strong> ${verdict}</p>
        `;

    } catch (error) {
        console.error(error);
        outputBox.innerHTML = `<p style="color:red;">Error occurred: ${error.message}</p>`;
    } finally {
        btn.disabled = false;
        btn.textContent = "Search";
    }
});
