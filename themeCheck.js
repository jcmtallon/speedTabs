
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
          }else{
            document.documentElement.setAttribute('data-theme', 'light');
          }
          
        }else{
    
          if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            document.documentElement.setAttribute('data-theme', 'dark');
          }else{
            document.documentElement.setAttribute('data-theme', 'light');
          }
        }
      });  
}

applyTheme();