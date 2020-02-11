

const themeOpt = document.getElementById('opt__darkTheme');
const themeCheckBox = document.getElementById('opt__darkTheme');
const resNbOpt = document.getElementById('opt__resNb');
const resNbOptSpan = document.getElementById('opt__resNbSpan');



/**
 * Gets user Dark Theme settings from storage and applies corresponding
 * theme attribute to document.
 * If user has not saved any dark theme settings yet, checks window matchMedia
 * and applies corresponding theme. 
 */
function applyTheme() {

  chrome.storage.sync.get(['themeIsDark'], function(result) {

    if (result.hasOwnProperty('themeIsDark')){

      if (result.themeIsDark){
        document.documentElement.setAttribute('data-theme', 'dark');
        themeCheckBox.checked = true;
      }else{
        document.documentElement.setAttribute('data-theme', 'light');
      }
      
    }else{

      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeCheckBox.checked = true;
      }else{
        document.documentElement.setAttribute('data-theme', 'light');
      }
    }
  }); 
}


/**
 * Gets number of results settings from storage and applies corresponding
 * setting to number of result select element.
 */
function applyNumberOfResults(){

  const defaultValue = 7;

  chrome.storage.sync.get(['nbOfResults'], function(result) {

  
    let value = defaultValue;

    if (result.hasOwnProperty('nbOfResults')) value = result.nbOfResults;

    resNbOptSpan.textContent = value;
    resNbOptSpan.setAttribute('data', `nbOfResults_${value}`); 
  }); 
}


/**
 * Stores user dark them value into storage.
 * @param {*} e
 */
function changeTheme(e){
  const value = e.target.checked;
  chrome.storage.sync.set({themeIsDark: value}, function(){
    applyTheme();    
  });
}

function turnIntoDdm(element, span){

  function showDropDownMenu(){ 
    element.tabIndex = 1;
    element.focus();
    element.classList.toggle('active');
    ddm.style.display = 'block';
  }

  function removeDropDownMenu(event){
    event.stopPropagation();  
    event.preventDefault(); 
    element.classList.remove('active');
    ddm.style.display = 'none';
  }

  function selectOption(){
    span.textContent = this.textContent;
    span.setAttribute('data', this.id); 
    element.blur(); 
    chrome.storage.sync.set({nbOfResults: this.textContent, function(){}});
  }

  const ddm = element.getElementsByClassName('dropdown-menu')[0];

  element.addEventListener( 'click', showDropDownMenu, true);
  element.addEventListener( 'focusout', removeDropDownMenu);
  
  ddm.querySelectorAll('li').forEach(function(item) {
    item.addEventListener('click', selectOption);
  });
}



// ---- START --- //

applyTheme();
applyNumberOfResults();

themeOpt.addEventListener( 'change', changeTheme);
turnIntoDdm(resNbOpt, resNbOptSpan);