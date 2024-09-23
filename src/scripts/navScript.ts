// TODO: investigate if this can be implemented on startup
// and then saved throughout application lifecycle

const menuItems = document.querySelectorAll('.menu__item');

function setActiveMenuItem() {
  const currentPath = window.location.pathname;

  let foundActive = false;
  menuItems.forEach((item) => {
    const link = item.getAttribute('href') || ''; // Get href directly from anchor

    // Compare current path and href
    if (link === currentPath || (link === '/' && currentPath === '/')) {
      item.classList.add('active');
      foundActive = true;
    } else {
      item.classList.remove('active');
    }
  });

  // Fallback to the first item if no match was found
  if (!foundActive && menuItems.length > 0) {
    menuItems[0].classList.add('active');
  }
}

function initNav() {
  const menu = document.querySelector('.menu') as HTMLElement;
  const menuDot = document.querySelector('.menu__dot') as HTMLElement;
  const menuBorder = document.querySelector('.menu__border') as HTMLElement;
  let isScrolling = false;

  function initPositioning() {
    const activeItem = document.querySelector('.menu__item.active') as HTMLElement;
    if (activeItem) {
      handleBorderPosition(menuBorder, menu, activeItem);
      moveDot(activeItem);
    }
  }

  function handleClick(item: Element) {
    let activeItem = document.querySelector('.menu__item.active');
    if (item === activeItem || !activeItem) return;

    activeItem.classList.remove('active');
    item.classList.add('active');

    activeItem = item;

    // Enable animation on click
    menuBorder.style.transition = 'transform var(--timeOut, var(--duration))';

    handleBorderPosition(menuBorder, menu, activeItem);
    moveDot(item, true);
  }

  function handleBorderPosition(menuBorder: HTMLElement, menu: HTMLElement, activeItem?: Element) {
    activeItem = activeItem || (document.querySelector('.active') as Element);
    const activeItemPosition = activeItem.getBoundingClientRect();

    const { left, width } = activeItemPosition;
    const menuLeft = menu.getBoundingClientRect().left;

    // Adjust the border's position relative to the active item's position and menu's scroll
    const moveRight = Math.floor(left - menuLeft - (menuBorder.offsetWidth - width) / 2) + 'px';
    menuBorder.style.transform = `translateX(${moveRight})`;
  }

  function moveDot(activeItem: Element, shouldAnimate = false) {
    const { left, width } = activeItem.getBoundingClientRect();
    const menuLeft = menu.getBoundingClientRect().left;

    // Get the scroll position of the menu
    const scrollLeft = menu.scrollLeft;

    // Adjust the dot position calculation to include the menu's scroll position
    const moveX = Math.floor(left - menuLeft + scrollLeft + width / 2 - 4) + 'px';

    // Update the dot position
    menuDot.style.setProperty('--dotPosition', moveX);

    // Only trigger animation if shouldAnimate is true
    if (shouldAnimate) {
      menuDot.classList.remove('active');
      // Wait for the next animation frame to re-add the active class and re-trigger the animation
      requestAnimationFrame(() => {
        menuDot.classList.add('active');
      });
    }
  }

  // Handle border movement on scroll
  menu.addEventListener('scroll', () => {
    if (!isScrolling) {
      // Disable animation during scroll
      menuBorder.style.transition = 'none';
      isScrolling = true;
    }

    const activeItem = document.querySelector('.menu__item.active') as HTMLElement;
    handleBorderPosition(menuBorder, menu, activeItem);
    moveDot(activeItem, false); // No animation on scroll

    // Set a delay to allow for scrolling to finish
    // otherwise the menu border will flicker
    setTimeout(() => {
      isScrolling = false;
    }, 150); // Adjust the delay as needed
  });

  // Resize event to adjust position on window resize
  window.addEventListener('resize', () => {
    const activeItem = document.querySelector('.menu__item.active') as HTMLElement;
    moveDot(activeItem, false); // No animation on resize
    handleBorderPosition(menuBorder, menu);
  });

  menuItems.forEach((item) => {
    item.addEventListener('click', () => handleClick(item));
  });

  setActiveMenuItem();
  initPositioning();
}

if (!window.navInitialized) {
  initNav();
  window.navInitialized = true;
}

document.addEventListener('astro:after-swap', setActiveMenuItem);
