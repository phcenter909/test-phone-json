const SHEET_ID = '1vF0D_WJXH5RUC7liF3fbcZCrLvre_xEGFGTD3FDYq1U';
const SHEET_GID = '0';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&tq&gid=${SHEET_GID}`;

let JSON_SPREADSHEET = ``;

let allProducts = [];

function formatPrice(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Seleção dinâmica do número do WhatsApp conforme dia/horário
// Regra:
// Sábado: 09:00 <= h < 14:00 -> 5584996775340, caso contrário -> 5584996775282
// Domingo: sempre -> 5584996775282
// Segunda-Sexta: 09:00 <= h < 18:00 -> 5584996775340, caso contrário -> 5584996775282
function getWhatsappNumber(date = new Date()) {
  const day = date.getDay();
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  
  const START_BUSINESS = 9 * 60;    // 09:00
  const END_WEEKDAY = 18 * 60;     // 18:00
  const END_SATURDAY = 14 * 60;    // 14:00

  const MAIN_NUMBER = '5584996775340';
  const SUPPORT_NUMBER = '5584996775282';

  // 1. Domingo: sempre suporte
  if (day === 0) return SUPPORT_NUMBER;

  // 2. Define o horário de encerramento baseado no dia
  const closingTime = (day === 6) ? END_SATURDAY : END_WEEKDAY;

  // 3. Verifica se está dentro do horário comercial
  const isBusinessHours = totalMinutes >= START_BUSINESS && totalMinutes < closingTime;

  return isBusinessHours ? MAIN_NUMBER : SUPPORT_NUMBER;
}


function openWhatsapp(message) {
  const number = getWhatsappNumber();
  const whatsappUrl = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank');
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return '';
}

function getProductImagePath(nomeProduto) {
  const normalized = String(nomeProduto || '').toUpperCase().trim();
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
    'IPHONE 16 PRO MAX': 'assets/IPhones/iPhone 16/iPhone 16 Pro Max/image.png'
  };

  return imageMap[normalized] || '';
}

function parseGvizResponse(gvizText) {
  if (!gvizText) return [];

  const rawText = typeof gvizText === 'string' ? gvizText.trim() : '';

  const parseTable = (table) => {
    if (!table?.cols || !Array.isArray(table.rows)) return [];

    const rows = Array.isArray(table.rows) ? table.rows : [];
    const fallbackHeaders = table.cols.map((col, index) => {
      const label = (col.label || '').trim();
      const columnName = label || (col.id || `col${index + 1}`).trim();
      return columnName;
    });

    let headers = fallbackHeaders;
    let dataRows = rows;

    if (rows.length > 0) {
      const firstRowValues = (rows[0]?.c || []).map((cell, index) => {
        const value = cell?.f !== undefined && cell?.f !== null
          ? cell.f
          : (cell?.v !== undefined ? cell.v : '');
        const normalizedValue = typeof value === 'string' ? value.trim() : '';
        return normalizedValue || fallbackHeaders[index] || `col${index + 1}`;
      });

      const looksLikeHeaders = firstRowValues.some((value) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value));

      if (looksLikeHeaders) {
        headers = firstRowValues;
        dataRows = rows.slice(1);
      }
    }

    return dataRows.map((row) => {
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
    }).filter((product) => Object.values(product).some((value) => String(value).trim()));
  };

  if (rawText.startsWith('{') || rawText.startsWith('[')) {
    try {
      const parsed = JSON.parse(rawText);
      if (parsed?.table) return parseTable(parsed.table);
      if (Array.isArray(parsed)) return parsed;
    } catch (error) {
      console.warn('Não foi possível interpretar o JSON diretamente.', error);
    }
  }

  const startToken = 'google.visualization.Query.setResponse(';
  const start = rawText.indexOf(startToken);

  if (start === -1) {
    return [];
  }

  const jsonText = rawText.substring(start + startToken.length, rawText.lastIndexOf(');'));
  const response = JSON.parse(jsonText);
  return parseTable(response?.table);
}

function normalizeProducts(data) {
  const normalizedProducts = data
    .map((product) => {
      const rawDescription = product.descricao || product.obs || product.observacao || product.description || product.descricaoProduto || '';
      const fallbackDescription = rawDescription || (product[Object.keys(product).find((key) => key === 'descricao')] || '');

      const name = firstNonEmpty(
        product.aparelhoDescricao,
        product.nome_produto,
        product.nomeProduto,
        product.name,
        product.titulo,
        product[Object.keys(product).find((key) => key === 'IPHONE 14')],
        product[Object.keys(product).find((key) => /^IPHONE|SAMSUNG|XIAOMI/i.test(key))],
        product[Object.keys(product).find((key) => key === 'A' && product[key])]
      );

      const description = firstNonEmpty(
        product.descricao,
        product.descricaoProduto,
        product.observacao,
        product.description,
        fallbackDescription
      );

      const price = Number(
        firstNonEmpty(
          product.valorVenda,
          product.valorVenda2,
          product.valorVenda3,
          product.valorCusto,
          product.preco,
          product.price,
          product.K,
          product['K'],
          product['5622'],
          product['0']
        )
      ) || 0;

      const state = firstNonEmpty(
        product.estadoProdutoDescricao,
        product.estado,
        product.estadoProduto,
        product.status,
        product['SEMI NOVO'],
        product['N'],
        product['AM'],
        product['AN']
      );

      const storage = firstNonEmpty(
        product.gbDescricao,
        product.memoria,
        product.armazenamento,
        product.storage,
        product['128gb'],
        product['Z'],
        product['AA']
      );

      const category = firstNonEmpty(
        product.tipoProdutoDescricao,
        product.categoria,
        product.tipo,
        product.category,
        product['CELULAR'],
        product['Y']
      );

      const resolvedName = name || (product["aparelhoDescricao"] ? product["aparelhoDescricao"] : 'Sem nome');
      const localImagePath = getProductImagePath(resolvedName);
      const image = firstNonEmpty(
        product.fotoUrl,
        product.foto,
        product.imagem,
        product.image,
        localImagePath
      );

      const imei = firstNonEmpty(
        product.imei,
        product.IMEI,
        product.imeiNumero,
        product.numeroImei,
        product['IMEI']
      );

      const hasBlockedKeyword = /(display|bateria)/i.test(String(product.aparelhoDescricao || ''));
      console.log(product)
      return {
        id: firstNonEmpty(product.id, product.codigo, product.sku, product.idProduto),
        name: resolvedName || 'Sem nome',
        description: description || `${state || 'Produto'} • ${storage || 'Sem informação'}`,
        price,
        state: state || 'Sem estado',
        storage: storage || 'Sem informação',
        category: category || 'Sem categoria',
        imei: imei || 'Não informado',
        image: image || 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80',
        shouldHide: hasBlockedKeyword,
        distinctKey: `${String(firstNonEmpty(product.aparelhoDescricao, resolvedName)).trim().toLowerCase()}::${String(state).trim().toLowerCase()}`
      };
    })
    .filter((product) => product.name && product.name !== 'Sem nome' && !product.shouldHide);

  const seenProducts = new Set();

  const uniqueProducts = normalizedProducts.filter((product) => {
    if (!product.distinctKey || seenProducts.has(product.distinctKey)) {
      return false;
    }

    seenProducts.add(product.distinctKey);
    return true;
  });

  return uniqueProducts.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

function renderProducts(products) {
  const grid = document.getElementById('products-grid');

  if (!grid) return;

  if (!products.length) {
    grid.innerHTML = `
      <div class="col-12 text-center py-5">
        <h5 class="text-muted">Nenhum produto encontrado.</h5>
      </div>
    `;
    return;
  }

  grid.innerHTML = products.map(product => `
    <div class="col-12 col-md-6 col-lg-4">
      <div class="card product-card shadow-sm h-100">
        <img src="${product.image}" class="product-image object-fit-contain" alt="${product.name}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=600&q=80';">
        <div class="card-body d-flex flex-column">
          <div class="d-flex justify-content-between align-items-start gap-2 mb-2">
            <h5 class="card-title mb-0">${product.name}</h5>
          </div>
          <div class="product-meta mb-3">
            <div>Armazenamento: ${product.state}</div>
            <div>Armazenamento: ${product.storage}</div>
            <div>IMEI: ${product.imei || 'Não informado'}</div>
          </div>
          <div class="mt-auto">
              <button class="btn btn-buy w-100" data-product-name="${product.name}" data-product-state="${product.state}" data-product-imei="${product.imei || ''}">
              <i class="bi bi-whatsapp me-2"></i>Comprar
            </button>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  document.querySelectorAll('.btn-buy').forEach((button) => {
    button.addEventListener('click', () => {
      const name = button.getAttribute('data-product-name') || 'produto';
      const state = button.getAttribute('data-product-state') || 'não informado';
      const imei = button.getAttribute('data-product-imei') || 'não informado';
      const message = `Olá, vim pelo site. Quero mais detalhes sobre o aparelho: ${name}, imei: ${imei}, estado: ${state}`;
      openWhatsapp(message);
    });
  });
}

function populateFilters(products) {
  const filter = document.getElementById('category-filter');
  if (!filter) return;

  const states = [...new Set(products.map(product => product.state))].sort();
  filter.innerHTML = '<option value="">Estado aparelho</option>';

  states.forEach(state => {
    const option = document.createElement('option');
    option.value = state;
    option.textContent = state;
    filter.appendChild(option);
  });
}

function filterProducts() {
  const searchInput = document.getElementById('search-input');
  const filter = document.getElementById('category-filter');

  if (!searchInput || !filter) return;

  const searchTerm = searchInput.value.toLowerCase().trim();
  const stateFilter = filter.value;

  const filtered = allProducts.filter(product => {
    const matchesSearch = !searchTerm || product.name.toLowerCase().includes(searchTerm) || product.description.toLowerCase().includes(searchTerm);
    const matchesState = !stateFilter || product.state === stateFilter;
    return matchesSearch && matchesState;
  });

  renderProducts(filtered);
}

window.askForXiaomi = function () {
  openWhatsapp('Eu vim pelo site e quero mais detalhes sobre um Xiaomi.');
};

function debounce(fn, delay = 300) {
  let timeoutId;

  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => fn(...args), delay);
  };
}

async function init() {
  try {
    const response = await fetch(SHEET_URL);

    if (!response.ok) {
      throw new Error(`Falha ao carregar a planilha (${response.status}).`);
    }

    const text = await response.text();
    const data = parseGvizResponse(text);

    allProducts = normalizeProducts(data);

    populateFilters(allProducts);
    renderProducts(allProducts);

    const searchInput = document.getElementById('search-input');
    const filter = document.getElementById('category-filter');

    if (searchInput) {
      searchInput.addEventListener('input', debounce(filterProducts, 300));
    }

    if (filter) {
      filter.addEventListener('change', filterProducts);
    }
  } catch (error) {
    console.error('Erro ao carregar os produtos.', error);
    const grid = document.getElementById('products-grid');
    if (grid) {
      grid.innerHTML = `
        <div class="col-12 text-center py-5 text-danger">
          Erro ao carregar os produtos. Verifique se a planilha está pública.
        </div>
      `;
    }
  }
}

window.addEventListener('DOMContentLoaded', init);
