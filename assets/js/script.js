const SHEET_ID = '1vF0D_WJXH5RUC7liF3fbcZCrLvre_xEGFGTD3FDYq1U';
const SHEET_GID = '0';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&tq&gid=${SHEET_GID}`;

// Seleção dinâmica do número do WhatsApp conforme dia/horário
// Regra:
// Sábado: 09:00 <= h < 14:00 -> 5584996775340, caso contrário -> 5584996775282
// Domingo: sempre -> 5584996775282
// Segunda-Sexta: 09:00 <= h < 18:00 -> 5584996775340, caso contrário -> 5584996775282

function getWhatsappNumber(date = new Date()) {
    const day = date.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const totalMinutes = date.getHours() * 60 + date.getMinutes();
    const startBusiness = 9 * 60;      // 09:00
    const endBusinessWeek = 18 * 60;   // 18:00
    const endBusinessSat = 14 * 60;    // 14:00

    if (day === 6) { // Saturday
        if (totalMinutes >= startBusiness && totalMinutes < endBusinessSat) {
            return '5584996775340';
        }
        return '5584996775282';
    }

    if (day === 0) { // Sunday
        return '5584996775282';
    }

    // Monday - Friday
    if (totalMinutes >= startBusiness && totalMinutes < endBusinessWeek) {
        return '5584996775340';
    }
    return '5584996775282';
}

let allProducts = [];

function parseGvizResponse(gvizText) {
    const startToken = 'google.visualization.Query.setResponse(';
    const start = gvizText.indexOf(startToken);

    if (start === -1) {
        throw new Error('Formato de resposta inesperado do Google Sheets.');
    }

    const jsonText = gvizText.substring(start + startToken.length, gvizText.lastIndexOf(');'));
    const response = JSON.parse(jsonText);
    const table = response?.table;

    if (!table?.cols || !Array.isArray(table.rows)) {
        return [];
    }

    const headers = table.cols.map(col => col.label || '').filter(Boolean);

    return table.rows.map(row => {
        const cells = row?.c || [];
        const product = {};

        headers.forEach((header, index) => {
            const cell = cells[index] || {};
            const value = cell.f !== undefined && cell.f !== null
                ? cell.f
                : (cell.v !== undefined ? cell.v : '');
            product[header] = value ?? '';
        });

        return product;
    });
}

// Normalização dos dados
function normalizeProducts(data) {
    return data.map(product => ({
        id: product.id?.trim() || "",
        nome_produto: product.aparelhoDescricao?.trim() || "Sem nome",
        fotos: product.foto?.trim() || "",
        // campo recebido da planilha com a URL da foto (JSON)
        fotoUrl: product.fotoUrl?.trim() || "",
        descricao: product.descricao?.trim() || "",
        preco: parseFloat(product.valorVenda) || parseFloat(product.valorCusto) || 0,
        disponivel: product.disponibilidade?.toLowerCase().includes("disponível"),
        categoria: product.tipoProdutoDescricao?.trim() || "Sem categoria",
        marca: product.marcaId?.trim() || "Sem marca",
        cor: product.corDescricao?.trim() || "",
        memoria: product.gbDescricao?.trim() || "",
        imei: product.imei?.trim() || "",
        estado: product.estadoProdutoDescricao?.trim() || "",
        // armazenar o id do estado (ex: 8505 = Novo, 8507 = Semi novo)
        estadoId: product.estadoProdutoId ? String(product.estadoProdutoId).trim() : "",
        sku: product.sku?.trim() || "",
        quantidade: parseInt(product.quantidade) || 0,
        fornecedor: product.fornecedorNome?.trim() || ""
    })).filter(p => p.disponivel && p.quantidade > 0);
}

function truncate(text, max) {
    if (!text) return '';
    return text.length > max ? text.slice(0, max) + '...' : text;
}

function getProductImagePath(nomeProduto) {
    const normalized = nomeProduto?.toUpperCase().trim() || '';
    const imageMap = {
        'IPHONE 11': 'assets/IPhones/iPhone 11/iPhone 11/ip11.png',
        'IPHONE 11 PRO': 'assets/IPhones/iPhone 11/iPhone 11 Pro/iph11pro.jpg',
        'IPHONE 11 PRO MAX': 'assets/IPhones/iPhone 11/iPhone 11 Pro Max/iph11pro.jpg',
        'IPHONE 12': 'assets/IPhones/iPhone 12/iPhone 12/image.png',
        'IPHONE 12 PRO': 'assets/IPhones/iPhone 12/iPhone 12 Pro/image.png',
        'IPHONE 12 PRO MAX': 'assets/IPhones/iPhone 12/iPhone 12 Pro Max/image.png',
        'IPHONE 13': 'assets/IPhones/iPhone 13/iPhone 13/image.png',
        'IPHONE 13 PRO': 'assets/IPhones/iPhone 13/iPhone 13 Pro/image.png',
        'IPHONE 13 PRO MAX': 'assets/IPhones/iPhone 13/iPhone 13 Pro Max/image.png',
        'IPHONE 14': 'assets/IPhones/iPhone 14/iPhone 14/image.png',
        'IPHONE 14 PLUS': 'assets/IPhones/iPhone 14/iPhone 14 Plus/image.png',
        'IPHONE 14 PRO': 'assets/IPhones/iPhone 14/iPhone 14 Pro/image.png',
        'IPHONE 14 PRO MAX': 'assets/IPhones/iPhone 14/iPhone 14 Pro Max/image.png',
        'IPHONE 15': 'assets/IPhones/iPhone 15/iPhone 15/image.png',
        'IPHONE 15 PLUS': 'assets/IPhones/iPhone 15/iPhone 15 Plus/image.png',
        'IPHONE 15 PRO': 'assets/IPhones/iPhone 15/iPhone 15 Pro/image.png',
        'IPHONE 15 PRO MAX': 'assets/IPhones/iPhone 15/iPhone 15 Pro Max/image.png',
        'IPHONE 16': 'assets/IPhones/iPhone 16/iPhone 16/image.png',
        'IPHONE 16 PRO': 'assets/IPhones/iPhone 16/iPhone 16 Pro/image.png',
        'IPHONE 16 PRO MAX': 'assets/IPhones/iPhone 16/iPhone 16 Pro Max/image.png',
    };

    return imageMap[normalized] || '';
}

// Renderizar produtos com Bootstrap
function renderProducts(products) {
    const grid = document.getElementById('products-grid');
    grid.innerHTML = '';

    if (products.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center py-5">
                <h5 class="text-muted">Nenhum produto encontrado.</h5>
            </div>
        `;
        return;
    }

    const seen = new Set();
    const distinctProducts = products
        .filter(product => !product.nome_produto.toLowerCase().includes('bateria'))
        .filter(product => {
        const key = `${product.nome_produto}|${product.estado}|${product.memoria}`;
        if (seen.has(key)) {
            return false;
        }
        seen.add(key);
        return true;
    });

    distinctProducts.sort((a, b) => a.nome_produto.localeCompare(b.nome_produto));

    distinctProducts.forEach(product => {
        const placeholder = 'https://images.unsplash.com/photo-1655627617149-d811dc052d16?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8NHx8ZW1wdHklMjBwaG9uZXxlbnwwfHwwfHx8MA%3D%3D';
        const localImage = getProductImagePath(product.nome_produto);
        const imageUrl = product.fotoUrl || product.fotos || localImage || placeholder;

        const cardHTML = `
            <div class="col-12 col-md-6 col-lg-4">
                <div class="card shadow-sm h-100 my-2">
                    <div class="row g-0 h-100">
                        <div class="col-md-5">
                            <img src="${imageUrl}" class="img-fluid rounded-start product-image" alt="${product.nome_produto}" style="object-fit: cover; height: 100%;" onerror="this.onerror=null; this.src='${placeholder}';">
                        </div>
                        <div class="col-md-7">
                            <div class="card-body d-flex flex-column h-100">
                                <h5 class="card-title">${product.nome_produto}</h5>
                                <div class="product-meta mb-3 small text-muted">
                                    ${product.estado ? `<div>Estado: ${product.estado}</div>` : ''}
                                    ${product.memoria ? `<div>Armazenamento: ${product.memoria}</div>` : ''}
                                </div>


                                <div class="mt-auto">
                                    <!-- <h6 class="text-success mb-2">R$ ${product.preco.toFixed(2)}</h6> -->
                                    <button onclick="buyProduct('${product.nome_produto}', '${product.descricao}', '${product.estado}', '${product.memoria}')"
                                            class="btn btn-success btn-sm w-100">
                                        <i class="bi bi-whatsapp me-2"></i> Comprar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        grid.innerHTML += cardHTML;
    });
}


// Abrir WhatsApp
window.buyProduct = function(nomeProduto, descricao, estado, memoria) {
    let mensagemProduto = `*${nomeProduto}*`;
    if (descricao) mensagemProduto += `\n${descricao}`;
    if (estado) mensagemProduto += `\nEstado: ${estado}`;
    if (memoria) mensagemProduto += `\nArmazenamento: ${memoria}`;

    const message = `Eu vim pelo Site\n\nOlá, tenho interesse no seguinte produto:\n\n${mensagemProduto}`;
    const number = getWhatsappNumber();
    const whatsappUrl = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
};

window.askForXiaomi = function() {
    const message = `Eu vim pelo Site\n\nOlá, estou procurando um Xiaomi. Vocês têm disponível?`;
    const number = getWhatsappNumber();
    const whatsappUrl = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
};

// Filtros
function filterProducts() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    const categoryFilter = document.getElementById('category-filter').value;

    const filtered = allProducts.filter(product => {
        const matchesSearch = !searchTerm ||
            product.nome_produto.toLowerCase().includes(searchTerm) 
            
        const matchesCategory = !categoryFilter || product.estadoId === categoryFilter;

        return matchesSearch && matchesCategory;
    });

    renderProducts(filtered);
}

function populateFilters() {
    // Usar categorias fixas: valores correspondem a estadoProdutoId na planilha
    const categories = [
        { id: '8505', label: 'Novo' },
        { id: '8507', label: 'Semi novo' }
    ];

    const catSelect = document.getElementById('category-filter');

    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat.id;
        opt.textContent = cat.label;
        catSelect.appendChild(opt);
    });
}

function debounce(fn, delay) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
    };
}

// Inicialização
async function init() {
    try {
        const response = await fetch(SHEET_URL);

        if (!response.ok) {
            throw new Error(`Falha ao carregar a planilha (${response.status}).`);
        }

        const text = await response.text();
        const data = parseGvizResponse(text);

        allProducts = normalizeProducts(data);

        populateFilters();
        renderProducts(allProducts);

        // Eventos
        document.getElementById('search-input').addEventListener('input', debounce(filterProducts, 300));
        document.getElementById('category-filter').addEventListener('change', filterProducts);

    } catch (error) {
        console.error(error);
        document.getElementById('products-grid').innerHTML = `
            <div class="col-12 text-center py-5 text-danger">
                Erro ao carregar os produtos. Verifique se a planilha está pública.
            </div>
        `;
    }
}

window.onload = init;