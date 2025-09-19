// グローバル変数
let allPokemon = [];
let displayedPokemon = [];
let currentOffset = 0;
const limit = 1000;
let isLoading = false;

// DOM要素
const pokemonGrid = document.getElementById('pokemonGrid');
const loadingElement = document.getElementById('loading');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const typeFilter = document.getElementById('typeFilter');
const modal = document.getElementById('pokemonModal');
const modalContent = document.getElementById('pokemonDetails');
const closeModal = document.querySelector('.close');

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    loadPokemon();
    setupEventListeners();
});

// イベントリスナーの設定
function setupEventListeners() {
    loadMoreBtn.addEventListener('click', loadMorePokemon);
    searchBtn.addEventListener('click', searchPokemon);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            searchPokemon();
        }
    });
    typeFilter.addEventListener('change', filterByType);
    closeModal.addEventListener('click', closeModalHandler);
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModalHandler();
        }
    });
}

// ポケモンデータの読み込み
async function loadPokemon() {
    if (isLoading) return;
    
    isLoading = true;
    showLoading(true);
    
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${currentOffset}`);
        const data = await response.json();
        
        // 各ポケモンの詳細データを取得
        const pokemonPromises = data.results.map(async (pokemon) => {
            const pokemonResponse = await fetch(pokemon.url);
            return await pokemonResponse.json();
        });
        
        const pokemonDetails = await Promise.all(pokemonPromises);
        
        allPokemon = [...allPokemon, ...pokemonDetails];
        displayedPokemon = [...allPokemon];
        
        renderPokemon(pokemonDetails);
        currentOffset += limit;
        
        // 次のページがあるかチェック
        if (data.next === null) {
            loadMoreBtn.style.display = 'none';
        }
        
    } catch (error) {
        console.error('ポケモンデータの読み込みに失敗しました:', error);
        showError('ポケモンデータの読み込みに失敗しました。もう一度お試しください。');
    } finally {
        isLoading = false;
        showLoading(false);
    }
}

// もっと読み込む
async function loadMorePokemon() {
    await loadPokemon();
}

// ポケモンの表示
function renderPokemon(pokemonList, append = true) {
    if (!append) {
        pokemonGrid.innerHTML = '';
    }
    
    pokemonList.forEach(pokemon => {
        const pokemonCard = createPokemonCard(pokemon);
        pokemonGrid.appendChild(pokemonCard);
    });
}

// ポケモンカードの作成
function createPokemonCard(pokemon) {
    const card = document.createElement('div');
    card.className = 'pokemon-card';
    card.addEventListener('click', () => showPokemonDetails(pokemon));
    
    const types = pokemon.types.map(type => 
        `<span class="type-badge type-${type.type.name}">${getTypeNameInJapanese(type.type.name)}</span>`
    ).join('');
    
    card.innerHTML = `
        <img src="${pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default}" 
             alt="${pokemon.name}" 
             onerror="this.src='${pokemon.sprites.front_default}'">
        <div class="pokemon-number">#${pokemon.id.toString().padStart(3, '0')}</div>
        <div class="pokemon-name">${getPokemonNameInJapanese(pokemon.name)}</div>
        <div class="pokemon-types">${types}</div>
    `;
    
    return card;
}

// ポケモンの検索
async function searchPokemon() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        displayedPokemon = allPokemon;
        renderPokemon(displayedPokemon, false);
        return;
    }
    
    // 数字の場合はIDで検索
    if (!isNaN(searchTerm)) {
        try {
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${searchTerm}`);
            if (response.ok) {
                const pokemon = await response.json();
                displayedPokemon = [pokemon];
                renderPokemon([pokemon], false);
                return;
            }
        } catch (error) {
            console.error('検索エラー:', error);
        }
    }
    
    // 名前で検索（既存のデータから）
    const filteredPokemon = allPokemon.filter(pokemon => 
        pokemon.name.toLowerCase().includes(searchTerm) ||
        getPokemonNameInJapanese(pokemon.name).includes(searchTerm)
    );
    
    if (filteredPokemon.length === 0) {
        // APIで直接検索を試行
        try {
            const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${searchTerm}`);
            if (response.ok) {
                const pokemon = await response.json();
                displayedPokemon = [pokemon];
                renderPokemon([pokemon], false);
                return;
            }
        } catch (error) {
            console.error('検索エラー:', error);
        }
        
        showError('ポケモンが見つかりませんでした。');
        return;
    }
    
    displayedPokemon = filteredPokemon;
    renderPokemon(filteredPokemon, false);
}

// タイプでフィルタリング
function filterByType() {
    const selectedType = typeFilter.value;
    
    if (!selectedType) {
        displayedPokemon = allPokemon;
        renderPokemon(displayedPokemon, false);
        return;
    }
    
    const filteredPokemon = allPokemon.filter(pokemon =>
        pokemon.types.some(type => type.type.name === selectedType)
    );
    
    displayedPokemon = filteredPokemon;
    renderPokemon(filteredPokemon, false);
}

// ポケモン詳細の表示
async function showPokemonDetails(pokemon) {
    try {
        // 追加の詳細情報を取得
        const speciesResponse = await fetch(pokemon.species.url);
        const speciesData = await speciesResponse.json();
        
        // 日本語の説明文を取得
        const jaDescription = speciesData.flavor_text_entries.find(
            entry => entry.language.name === 'ja'
        );
        
        const types = pokemon.types.map(type => 
            `<span class="type-badge type-${type.type.name}">${getTypeNameInJapanese(type.type.name)}</span>`
        ).join('');
        
        const stats = pokemon.stats.map(stat => {
            const statName = getStatNameInJapanese(stat.stat.name);
            const statValue = stat.base_stat;
            const percentage = Math.min((statValue / 150) * 100, 100);
            
            return `
                <div class="stat-row">
                    <div class="stat-name">${statName}</div>
                    <div class="stat-bar">
                        <div class="stat-fill" style="width: ${percentage}%"></div>
                    </div>
                    <div class="stat-value">${statValue}</div>
                </div>
            `;
        }).join('');
        
        modalContent.innerHTML = `
            <img src="${pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default}" 
                 alt="${pokemon.name}"
                 onerror="this.src='${pokemon.sprites.front_default}'">
            <h2>${getPokemonNameInJapanese(pokemon.name)}</h2>
            <div class="pokemon-number">#${pokemon.id.toString().padStart(3, '0')}</div>
            <div class="pokemon-types">${types}</div>
            
            <div style="margin: 20px 0;">
                <p><strong>高さ:</strong> ${pokemon.height / 10} m</p>
                <p><strong>重さ:</strong> ${pokemon.weight / 10} kg</p>
                ${jaDescription ? `<p><strong>説明:</strong> ${jaDescription.flavor_text.replace(/\f/g, ' ')}</p>` : ''}
            </div>
            
            <div class="pokemon-stats">
                <h3>基本ステータス</h3>
                ${stats}
            </div>
        `;
        
        modal.style.display = 'block';
        
    } catch (error) {
        console.error('ポケモン詳細の取得に失敗しました:', error);
        showError('ポケモンの詳細情報を取得できませんでした。');
    }
}

// モーダルを閉じる
function closeModalHandler() {
    modal.style.display = 'none';
}

// ローディング表示の切り替え
function showLoading(show) {
    loadingElement.style.display = show ? 'block' : 'none';
    loadMoreBtn.disabled = show;
}

// エラー表示
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        background: #ff4444;
        color: white;
        padding: 15px;
        border-radius: 10px;
        margin: 20px 0;
        text-align: center;
    `;
    errorDiv.textContent = message;
    
    pokemonGrid.parentNode.insertBefore(errorDiv, pokemonGrid);
    
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

// 日本語名前の取得（簡単なマッピング）
function getPokemonNameInJapanese(englishName) {
    const nameMap = {
        'bulbasaur': 'フシギダネ',
        'ivysaur': 'フシギソウ',
        'venusaur': 'フシギバナ',
        'charmander': 'ヒトカゲ',
        'charmeleon': 'リザード',
        'charizard': 'リザードン',
        'squirtle': 'ゼニガメ',
        'wartortle': 'カメール',
        'blastoise': 'カメックス',
        'caterpie': 'キャタピー',
        'metapod': 'トランセル',
        'butterfree': 'バタフリー',
        'weedle': 'ビードル',
        'kakuna': 'コクーン',
        'beedrill': 'スピアー',
        'pidgey': 'ポッポ',
        'pidgeotto': 'ピジョン',
        'pidgeot': 'ピジョット',
        'rattata': 'コラッタ',
        'raticate': 'ラッタ',
        'pikachu': 'ピカチュウ',
        'raichu': 'ライチュウ'
    };
    
    return nameMap[englishName] || englishName.charAt(0).toUpperCase() + englishName.slice(1);
}

// タイプ名の日本語変換
function getTypeNameInJapanese(englishType) {
    const typeMap = {
        'normal': 'ノーマル',
        'fire': 'ほのお',
        'water': 'みず',
        'electric': 'でんき',
        'grass': 'くさ',
        'ice': 'こおり',
        'fighting': 'かくとう',
        'poison': 'どく',
        'ground': 'じめん',
        'flying': 'ひこう',
        'psychic': 'エスパー',
        'bug': 'むし',
        'rock': 'いわ',
        'ghost': 'ゴースト',
        'dragon': 'ドラゴン',
        'dark': 'あく',
        'steel': 'はがね',
        'fairy': 'フェアリー'
    };
    
    return typeMap[englishType] || englishType;
}

// ステータス名の日本語変換
function getStatNameInJapanese(englishStat) {
    const statMap = {
        'hp': 'HP',
        'attack': 'こうげき',
        'defense': 'ぼうぎょ',
        'special-attack': 'とくこう',
        'special-defense': 'とくぼう',
        'speed': 'すばやさ'
    };
    
    return statMap[englishStat] || englishStat;
}