// Result list max number of results.
// TODO: setteable from Options / or popup.
const maxResults = 7;

// Remembers selected result index. 
let sel_index = 0;

// Remembers last selected result type.
let lastType = '';

// UI references.
const searchBar = document.getElementById('searchBar');
const list = document.getElementById('result-list');
const searchIcon = document.getElementById('search-icon');
const hintLabel = document.getElementById('top-section__hint');
const searchBarLabel = document.getElementById('top-section__title');

// Search bar is focused when the popup appears.
searchBar.focus();


//TODO: rethink this method 
function genNoResultsItem(){
  return{
    id: 0,
    index: 0,
    title: 'No items found.',
    active: false,
    favIconUrl: './icons/default.png',
    url: '',
    typeIconUrl: './icons/tab.svg',
    type: 'noResutls',
    actionQuery: null
  }
}


///////////////// DATA RETRIEVAL METHODS ///////////////////

/**
 * Returns open tab objects which url or title match agains 
 * the passed query string. 
 * If query string is empty, returns all open tabs. 
 * Always filters out New tabs.
 * @param {string} query
 * @returns {Object[]}
 */
function getOpenTabs (query) {

  const ciQuery = query.toLowerCase();

  function parseTab (tab) {
    return{
      id: tab.id,
      index: tab.index,
      title: tab.title,
      active: tab.active,
      favIconUrl: (tab.favIconUrl !== undefined) ? tab.favIconUrl : './icons/default.png',
      url: tab.url,
      typeIconUrl: './icons/tab.svg',
      type: 'openTab',
      actionQuery: tab.id
    }
  }

  function getChromeTabs(options){
    return new Promise((resolve, reject) => {

      chrome.tabs.query(options, function(tabs){
        let results = [];

        if(tabs){
          tabs.forEach(function(tab){
            const ciTitle = tab.title.toLowerCase();
            const ciUrl = tab.url.toLowerCase();
            if(ciTitle!=='new tab' && (ciQuery==='' || ciTitle.includes(ciQuery) || ciUrl.includes(ciQuery))){
              results.push(parseTab(tab));
            }
          });
          resolve(results);

        }else{
          console.log('Can\'t get tabs!')
          reject(0);
        }
      });
    });
  }
  return getChromeTabs({active: false});
}

/**
 * Returns bookmarks stored in Chrome which url or title match agains 
 * the passed query string. 
 * If query string is empty, returns all bookmarks. 
 * @param {*} query
 * @returns {Object[]}
 */
function getBookMarks (query) {

  const ciQuery = query.toLowerCase();

  let results = [];

  function parseBookMark (bm) {
    return{
      id: bm.id,
      index: bm.index,
      title: bm.title,
      active: false,
      favIconUrl: 'chrome://favicon/' + bm.url,
      url: bm.url,
      typeIconUrl: './icons/bookmark.svg',
      type: 'bookmark',
      actionQuery: bm.url
    }
  }

  function printBms (bms) {
    bms.forEach(function(bm){
      if (bm.children) {
        printBms(bm.children); 

      }else{
        const ciTitle = bm.title.toLowerCase();
        const ciUrl = bm.url.toLowerCase();
        if(ciQuery==='' || ciTitle.includes(ciQuery) || ciUrl.includes(ciQuery)){
          results.push(parseBookMark(bm));
        }
      }
    });
  }

  function extractBmsFromWholeTree(){
    return new Promise((resolve, reject) => {

      chrome.bookmarks.getTree(function(tree){ 
        if(tree){
          printBms(tree);
          resolve(results);
        
        }else{
          console.log(`Can't get bookmarks!`)
          reject(0);
        }
      });
    });
  }

  return extractBmsFromWholeTree();    
}











///////////////// RESULT ITEM ACTIONS ///////////////////

/**
 * Using the passed query parameter as options, executes a different 
 * action depending on the specified type and if the control key was 
 * pushed when this function was called.
 *  @param {*} query Can be a tab id, a url, etc., depending on the required action.
 * @param {string} type
 * @param {boolean} ctrlKeyOn
 */
function executeAction(query, type, ctrlKeyOn=false){

  switch (type) {
    case 'openTab':
      if (ctrlKeyOn) {
        chrome.tabs.duplicate(parseInt(query), () => {});
      }else{
        chrome.tabs.update(parseInt(query), {active: true}, () => {});   
      }
      break;

    case 'noResults':
      
      break;

    case 'bookmark':
      if (ctrlKeyOn) {
        chrome.tabs.create({url: query, active: true});
      }else{
        chrome.tabs.update({url: query});
        window.close();
      }

      break;
  
    default:
      break;
  }
}




///////////////// RENDER METHODS ///////////////////

/**
 * Renders result list items based passed array of items.
 * @param {object[]} itemArr
 */
function renderList(itemArr){

  list.innerHTML = '';

  let items = itemArr;
  if (items.length > maxResults) items.length = maxResults;

  items.forEach(function (item) {

    let siteIcon = document.createElement('img');
    siteIcon.classList.add('result__site-icon');
    siteIcon.src = item.favIconUrl;

    let leftIcon = document.createElement('div');
    leftIcon.classList.add('result__left-icon');
    leftIcon.appendChild(siteIcon);

    let title = document.createElement('div');
    title.classList.add('result__title');
    title.textContent = item.title.trim();
    
    let rightIcon = document.createElement('img');
    rightIcon.classList.add('result__right-icon');
    rightIcon.src = item.typeIconUrl;

    let listItem = document.createElement('li');
    listItem.classList.add('result__cointainer');
    listItem.setAttribute('selected', 'false');
    listItem.setAttribute('query', item.actionQuery);
    listItem.setAttribute('type', item.type);

    listItem.appendChild(leftIcon);
    listItem.appendChild(title);
    listItem.appendChild(rightIcon);

    listItem.addEventListener('click', function(){
      executeAction(item.actionQuery, item.type);
    });

    list.appendChild(listItem);
  });
}



/**
 * Removes selected status from all result list items
 * and returns selected status to the specified 
 * list item by its iindex number.
 */
function highlightSelection(){

  const current = list.querySelectorAll('[selected="true"]');

  if(current.length > 0){
    current.forEach(function(item){
      item.setAttribute('selected', 'false');
    });
  }

  list.childNodes[sel_index].setAttribute('selected', 'true');
}


/**
 * Clears search bar and requests a
 * search icon update.
 */
function clearSearchBar(){
  searchBar.value = '';
  searchBar.focus();
  updateSearchIcon();
  executeQuery(searchBar.value);
}


/**
 * If search bar is empty, shows lupa icon.
 * If not, shows cancel button. 
 * Clicking cancel button clears search bar. 
 */
function updateSearchIcon(){

  const input = searchBar.value;

  if(input===''){
    searchIcon.src = './icons/lupa.svg';
    searchIcon.removeEventListener('click', clearSearchBar);
    searchIcon.classList.remove('clickeable-icon');

  }else{
    searchIcon.src = './icons/cancel.svg';
    searchIcon.addEventListener('click', clearSearchBar);
    searchIcon.classList.add('clickeable-icon');
  }
}



/**
 * Displays a hint of userful shortcuts for the type of 
 * result currently selected.
 * Shows no hint when no input in search bar. 
 */
function refreshTopBar(){

  const type = list.childNodes[sel_index].getAttribute('type');

  if(type===lastType) return;
  
  let hint = document.createElement('div');
  hint.classList.add('top-section__hint-inner');

  let label = document.createElement('div');
  label.classList.add('top-section__title-inner');

  switch (type) {
    case 'openTab':
      label.textContent = 'activate tab';
      hint.textContent = 'duplicate (ctrl + enter)';
      break;

    case 'bookmark':
      label.textContent = 'open bookmark'
      hint.textContent = 'open in new tab (ctrl + enter)';
      break;
    
    case 'search':
      label.textContent = 'search'
      hint.textContent = 'open in new tab (ctrl + enter)';
  
    default:
      break;
  }
  if(hintLabel.childNodes.length > 0) hintLabel.innerHTML = '';
  if(searchBarLabel.childNodes.length > 0) searchBarLabel.innerHTML = '';

  searchBarLabel.appendChild(label);
  hintLabel.appendChild(hint);

  lastType = type;

}
















///////////////// SEL_INDEX METHODS ///////////////////

/**
 * Sums passed value to global sel_index variable. 
 * If sel_index exceeds the number of availabe items 
 * in the result list, sel_index is sent back to 0. 
 * On the other way around, if sel_index becomes a negative
 * number, then receives the number of items in the list so 
 * the selector highlight shows on the bottom of the list instead.
 * @param {Number} value
 */
function updateSelIndex(value){
  const nbOfItems = list.childNodes.length;

  let newIndex = sel_index + value;

  if(newIndex >= nbOfItems){
    newIndex = newIndex - nbOfItems;
  }else if(newIndex < 0){
    newIndex = nbOfItems + newIndex;
  }

  sel_index = newIndex;
}

/**
 * Sets global sel_index variable as 0 so the 
 * selector highlight of the results list goes back 
 * to the first row. 
 */
function resetSelIndex(){
  sel_index = 0;
}







///////////////// SEARCH METHOD ///////////////////

/**
 * 
 *
 * @param {string} query
 */
async function executeQuery (query) {

  let results = [];

  let tabs = await getOpenTabs(query);
  results = results.concat(tabs);

  if (results.length < maxResults){
    let bms = await getBookMarks(query);
    results = results.concat(bms);
  }

  // If tabs + bookmarks < 6, get google search. 

  // Can I simulate quick search? 
  // Investigar

  if(results.length === 0) results.push(genNoResultsItem());

  renderList(results);
  resetSelIndex();
  highlightSelection();
  refreshTopBar();
}







///////////////// START ///////////////////

// Popup re-searches with every
// input change in the search bar.
searchBar.addEventListener('input', function(){
  updateSearchIcon();
  executeQuery(searchBar.value);
});

// Arrow up-down moves result selector.
// ENTER executes item action. 
document.addEventListener('keydown', (event) => {
  switch (event.code) {
    case 'ArrowDown':
      event.preventDefault();
      updateSelIndex(1);
      highlightSelection();
      refreshTopBar();
      break;

    case 'ArrowUp':
      event.preventDefault();
      updateSelIndex(-1);
      highlightSelection();
      refreshTopBar();
      break;
    
    case 'Enter':
      event.preventDefault();
      const query = list.childNodes[sel_index].getAttribute('query');
      const type = list.childNodes[sel_index].getAttribute('type');
      executeAction(query, type, event.ctrlKey);

      default:      
  }
});

//Execute initial search 
//right after opening popup.
executeQuery(searchBar.value);





