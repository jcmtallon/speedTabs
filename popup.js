// Result list max number of results.
let maxResults = 7;

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
const optionIcon = document.getElementById('options-icon');

// Search bar is focused when the popup appears.
searchBar.focus();





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
      favIconUrl: (tab.favIconUrl === '' || tab.favIconUrl === undefined) ? './icons/default.png' : tab.favIconUrl,
      url: tab.url,
      typeIconUrl: './icons/tab.svg',
      type: 'openTab',
      actionQuery: {tabId: tab.id, windowId: tab.windowId}
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
  return getChromeTabs({});
}

/**
 * Returns bookmarks stored in Chrome which url or title match agains 
 * the passed query string. 
 * If query string is empty, returns all bookmarks. 
 * @param {string} query
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


/**
 * Returns a search type result object with the same title as 
 * the input from the search box, and a lupa icon. 
 * @param {string} query
 * @returns {Object[]}
 */
function searchOption(query){
  return{
    id: null,
    index: null,
    title: query,
    active: false,
    favIconUrl: './icons/lupa.svg',
    url: '',
    typeIconUrl: '',
    type: 'search',
    actionQuery: query
  }
}


function getHistory(query){

  const ciQuery = query.toLowerCase();

  function parseEntry (entry) {
    return{
      id: entry.id,
      index: 0,
      title: entry.title,
      active: false,
      favIconUrl: 'chrome://favicon/' + entry.url,
      url: entry.url,
      typeIconUrl: './icons/bookmark.svg', //TODO: get icon for history entry (clock)
      type: 'bookmark', //TODO: add a new type
      actionQuery: entry.url //TODO: define actionQuery
    }
  }

  function extractHistory(){
    return new Promise((resolve, reject) => {

      let params = {
        text: ciQuery,
        maxResults: 10
      }

      chrome.history.search(params,(entries) => { 
        if(entries){

          let results = [];

          entries.forEach(function(entry){
            const ciTitle = entry.title.toLowerCase();
            const ciUrl = entry.url.toLowerCase();
            if((ciQuery==='' || ciTitle.includes(ciQuery) || ciUrl.includes(ciQuery))){
              results.push(parseEntry(entry));
            }
          });
          resolve(results);
        
        }else{
          console.log(`Can't get history!`)
          reject(0);
        }
      });
    });
  }

  return extractHistory();    
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
function executeAction(query, type, ctrlKeyOn=false, alkKeyOn=false){

  switch (type) {

    case 'openTab':

      //Splits specified tab to the right.
      if (ctrlKeyOn & alkKeyOn){
        resizeCurrentWindowToTheLeft();
        moveTabToRight(query.tabId);
        window.close();

      //Duplicates specified tab.
      }else if (ctrlKeyOn) {
        chrome.tabs.duplicate(parseInt(query.tabId), () => {});
        chrome.windows.update(parseInt(query.windowId), {focused: true}, () => {});
        window.close();

      //Activates specified tab
      }else{
        chrome.tabs.update(parseInt(query.tabId), {active: true}, () => {});
        chrome.windows.update(parseInt(query.windowId), {focused: true}, () => {});
        window.close();
      }
      break;



    case 'search':

      //Splits new window to the right and searches specified text.
      if (ctrlKeyOn & alkKeyOn){
        resizeCurrentWindowToTheLeft();
        moveTabToRight(undefined, 'http://google.com/search?q=' + query);
        window.close();

      //Searches specified text in a new tab.
      }else if (ctrlKeyOn) {
        chrome.tabs.create({url: 'http://google.com/search?q=' + query, active: true});


      //Searches specified text in current tab.
      }else{
        chrome.tabs.update({url: 'http://google.com/search?q=' + query});
        window.close();
      }

      break;

    case 'bookmark':

      //Split specified bookmark to the right
      if (ctrlKeyOn & alkKeyOn){
        resizeCurrentWindowToTheLeft();
        moveTabToRight(undefined, query);
        window.close();

      //Opens specified bookmark in a different page
      }else if (ctrlKeyOn) {
        chrome.tabs.create({url: query, active: true});

      //Opens specified bookmark in current tab.
      }else{
        chrome.tabs.update({url: query});
        window.close();
      }
      break;

      //TODO: add case history entry
  
    default:
      break;
  }
}


/**
 * Resizes current window size and position so it
 * fits the left side of the screen. 
 */
function resizeCurrentWindowToTheLeft () {

  chrome.windows.getCurrent({}, (currentWin) => {

    const params = {
      left: screen.availLeft,
      top: screen.availTop,
      width: screen.availWidth/2,
      height: screen.availHeight,
      state: 'normal',
      focused: false
    }

    chrome.windows.update(currentWin.id, params, (res)=>{
    })
  })
}

/**
 * Creates new window that fits the right side of the screen 
 * and moves the indicated tab into it. 
 * @param {number} tabId
 */
function moveTabToRight(tabId, url){

  const params = {
    left: screen.availLeft + (screen.availWidth/2),
    top: screen.availTop,
    width: screen.availWidth/2,
    height: screen.availHeight,
    state: 'normal',
    focused: true
  }

  if(tabId!==undefined) params.tabId = tabId;
  if(url!==undefined){params.url = url};

  chrome.windows.create(params, (res)=>{
    if (url!=undefined) {
        chrome.tabs.update(parseInt(res.tabs[0].id), {active: true}, () => {});
    }
  });
}




///////////////// RENDER METHODS ///////////////////

function getTitleWithMatchHighlight(item, query){
  
  const title = item.title.trim();
  const ciTitle = title.toLowerCase();
  const ciQuery = query.toLowerCase();

  const start = ciTitle.indexOf(ciQuery);
  const end = start + ciQuery.length;

  if (start < 0 || item.type==='search') return document.createTextNode(title);
    
  const firstPart = title.substring(0, start);
  const middlePart = title.substring(start, end);
  const lastPart = title.substring(end);

  let firstNode = document.createTextNode(firstPart);
  let lastNode = document.createTextNode(lastPart);

  let hightlight = document.createElement('span');
  hightlight.classList.add('result__highlight');
  hightlight.textContent = middlePart;

  let container = document.createElement('span');
  container.appendChild(firstNode);
  container.appendChild(hightlight);
  container.appendChild(lastNode);

  return container;
}

/**
 * Renders result list items based passed array of items.
 * @param {object[]} itemArr - array of result objects
 * @param {string} query - user input from search bar
 */
function renderList(itemArr, query){

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
    title.appendChild(getTitleWithMatchHighlight(item, query));

    let url = document.createElement('div');
    url.classList.add('result__url');
    url.textContent = (item.url!=='') ? `-  ${item.url}` : '';

    let titleContainer = document.createElement('div');
    titleContainer.classList.add('result__title-container');
    titleContainer.appendChild(title);
    titleContainer.appendChild(url);
    
    let rightIcon = document.createElement('img');
    rightIcon.classList.add('result__right-icon');
    rightIcon.src = item.typeIconUrl;

    let listItem = document.createElement('li');
    listItem.classList.add('result__cointainer');
    listItem.setAttribute('selected', 'false');
    listItem.setAttribute('query', JSON.stringify(item.actionQuery));
    listItem.setAttribute('type', item.type);

    listItem.appendChild(leftIcon);
    listItem.appendChild(titleContainer);
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

  function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  let type = list.childNodes[sel_index].getAttribute('type');

  if(type===lastType) return;

  const os = navigator.platform;
  const specialKey1 = (os.substring(0,3)=='Mac') ? 'command' : 'ctrl';
  
  let hint = document.createElement('div');
  hint.classList.add('top-section__hint-inner');

  let label = document.createElement('div');
  label.classList.add('top-section__title-inner');

  let stack;

  switch (type) {
    case 'openTab':
      label.textContent = 'activate tab';
      stack = [
        `duplicate (${specialKey1} + enter)`,
        `show in right side (${specialKey1} + alt + enter)`
      ];
      break;

    case 'bookmark':
      label.textContent = 'open bookmark';
      stack = [
        `open in new tab (${specialKey1} + enter)`,
        `open in right side (${specialKey1} + alt + enter)`,
      ]
      break;
    
    case 'search':
      label.textContent = 'search';
      stack = [
        `search in new tab (${specialKey1} + enter)`,
        `search in right side (${specialKey1} + alt + enter)`,
      ]

    //TODO: add case history entry
  
    default:
      break;
  }

  let index = getRandomInt(0, stack.length-1);
  hint.textContent = stack[index];

  let randomlyTrue = Math.random() >= 0.6;
  if(searchBar.value==='' & randomlyTrue){
    hint.textContent = 'show active tab in right side (TAB key)';
    type ='emptySearch';
  };

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

  if (results.length < maxResults){
    let hist = await getHistory(query);
    results = results.concat(hist);
  }

  //TODO: remove duplicates (for example: open Tab bookmark and history same item).

  // Can I simulate quick search? TODO: Investigar

  if(results.length < maxResults) results.push(searchOption(query));

  renderList(results, query);
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
      const query = JSON.parse(list.childNodes[sel_index].getAttribute('query'));
      const type = list.childNodes[sel_index].getAttribute('type');
      const controlWasClicked = (event.ctrlKey || event.metaKey) ? true : false;
      executeAction(query, type, controlWasClicked, event.altKey);
      break; 
    
    case 'Tab':
      if (searchBar.value ===''){
        event.preventDefault();
        chrome.tabs.query({ active: true, currentWindow: true }, (res)=>{
          const query = {tabId: res[0].id};
          executeAction(query, 'openTab', true, true);
        });
      }
      break;


      default:      
  }
});


// Gear icon opens option page in a different tab.
optionIcon.addEventListener('click', (event) => {
  chrome.tabs.create({'url': "/options.html" } )
});


//Execute initial search 
//right after opening popup
//and applying the user settings.
chrome.storage.sync.get(['nbOfResults'], function(result) {
  if (result.hasOwnProperty('nbOfResults')) maxResults = result.nbOfResults;
  executeQuery(searchBar.value);
}); 






