function toggleItemState(item, markDone) {
	let itemEl = item.querySelector('.item');
	let stateEl = item.querySelector('.state');
	let strikeEl = item.querySelector('.strike');
	
	item.classList.toggle('items-done', markDone);
	itemEl.classList.toggle('items-done', markDone);
	stateEl.classList.toggle('state-done', markDone);
	strikeEl.style.opacity = markDone ? "1" : "0";
}

let checklist_layout_mode = "one";
let checklist_layout_listeners = false;

function checklist_layout_apply() {
	let content = document.getElementById("content");
	let layout_buttons;
	let layout_icon = "layout-one";

	if(!content) { return; }
	if(checklist_layout_mode == "two") { layout_icon = "layout-two"; }

	content.classList.toggle("two-column-layout", checklist_layout_mode == "two");
	sessionStorage.setItem("checklist_layout", checklist_layout_mode);

	layout_buttons = document.querySelectorAll('.layout_icon');
	layout_buttons.forEach(function(btn) {
		btn.setAttribute("icon", layout_icon);
		btn.innerHTML = iconRender(layout_icon);
	});
	checklist_sidebar_align();
}

function checklist_layout_switch() {
	if(checklist_layout_mode == "one") {
		checklist_layout_mode = "two";
	} else {
		checklist_layout_mode = "one";
	}
	checklist_layout_apply();
}

function checklist_layout_load() {
	let layout_buttons;

	if(sessionStorage.getItem("checklist_layout") !== null) {
		checklist_layout_mode = sessionStorage.getItem("checklist_layout");
	}
	if(checklist_layout_mode !== "two") { checklist_layout_mode = "one"; }

	if(!checklist_layout_listeners) {
		layout_buttons = document.querySelectorAll('.layout_switch');
		layout_buttons.forEach(function(btn) { btn.addEventListener('click', checklist_layout_switch, false); });
		checklist_layout_listeners = true;
	}

	checklist_layout_apply();
}

function checklist_heading_id(title, id_cache) {
	let base_id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
	if(base_id == "") { base_id = "section"; }
	if(!id_cache[base_id]) {
		id_cache[base_id] = 1;
		return base_id;
	}
	id_cache[base_id] += 1;
	return base_id + "-" + id_cache[base_id];
}

let checklist_sidebar_resize_listener = false;

function checklist_sidebar_align() {
	let sidebar = document.getElementById("checklist_sidebar");

	if(!sidebar) { return; }
	if(window.matchMedia("(max-width: 999px)").matches) {
		sidebar.style.marginTop = "";
		return;
	}

	sidebar.style.marginTop = "80px";
}

function checklist_sidebar_build() {
	let sidebar = document.getElementById("checklist_sidebar");
	let headings;
	let title_el;
	let links_el;
	let current_mode = "dark";

	if(!sidebar) { return; }
	if(document.body && document.body.getAttribute("mode")) {
		current_mode = document.body.getAttribute("mode");
	}

	headings = Array.from(document.querySelectorAll('#content .sublist > .title')).filter(function(heading) {
		return !heading.classList.contains("green") && !heading.classList.contains("blue");
	});

	sidebar.innerHTML = "";
	if(headings.length === 0) { return; }

	title_el = document.createElement("div");
	title_el.className = "sidebar-heading";
	title_el.setAttribute("mode", current_mode);
	title_el.textContent = "Sections";
	sidebar.appendChild(title_el);

	links_el = document.createElement("div");
	links_el.className = "sidebar-links";

	headings.forEach(function(heading) {
		let link = document.createElement("a");
		link.className = "sidebar-link";
		link.setAttribute("mode", current_mode);
		link.href = "#" + heading.id;
		link.textContent = heading.textContent;
		links_el.appendChild(link);
	});

	sidebar.appendChild(links_el);
	checklist_sidebar_align();

	if(!checklist_sidebar_resize_listener) {
		window.addEventListener("resize", checklist_sidebar_align);
		checklist_sidebar_resize_listener = true;
	}
}

function checklist_item_cross() {
	let itemsList = document.getElementsByClassName('items');
	let isDone = this.classList.contains('items-done');
	
	// Clear all highlights
	Array.from(itemsList).forEach(item => item.classList.remove('highlight'));
	
	// Toggle this item
	toggleItemState(this, !isDone);
	
	// If unchecking, highlight this item and return
	if(isDone) {
		this.classList.add('highlight');
		return;
	}
	
	// Scroll if needed
	if(this.getBoundingClientRect().top > screen.height * 0.65) {
		window.scroll({top: this.getBoundingClientRect().top - 10 + window.scrollY, behavior: 'smooth'});
	}
	
	// Highlight next item
	let next = this.nextElementSibling;
	if(next) {
		if(next.classList.contains('items')) {
			next.classList.add('highlight');
		} else if(next.classList.contains('comment')) {
			next.classList.add('comment-strike');
			if(next.nextElementSibling) next.nextElementSibling.classList.add('highlight');
		}
	}
}

function checklist_subcheckcross(event) {
	// Only trigger if double-clicking on the title itself, not child items
	if(event.target.classList.contains('items') || event.target.closest('.items')) {
		return;
	}
	
	// Get all item children
	let items = Array.from(this.querySelectorAll('.items'));
	if(items.length === 0) return;
	
	// Determine if we should mark done (if ANY are unchecked)
	let shouldMarkDone = items.some(item => !item.classList.contains('items-done'));
	
	// Toggle all items
	items.forEach(item => {
		item.classList.remove('highlight');
		toggleItemState(item, shouldMarkDone);
	});
	
	// Scroll to appropriate position
	let scrollTarget = shouldMarkDone ? items[items.length - 1] : items[0];
	window.scroll({top: scrollTarget.getBoundingClientRect().top - 10 + window.scrollY, behavior: 'smooth'});
	
	// Highlight first unchecked item
	let allItems = document.querySelectorAll('.item');
	for(let item of allItems) {
		if(!item.classList.contains('items-done')) {
			item.parentNode.classList.add('highlight');
			break;
		}
	}
}

async function checklist_load_masterlist() { 
	const masterlist_obj = await fetch("lists/masterlist.json");
	let masterlist = await masterlist_obj.json();
	let i;
	for(i = 0; i < masterlist.checklist.length; i++) {
		checklist_display_title("checklists", masterlist.checklist[i].file, masterlist.checklist[i].name);
	}
}

function checklist_display_title(element_id, file, name) { 
	let element = document.getElementById(element_id);
	element.innerHTML += "- <a href='checklist.html?l=" + file + "' mode='dark'>" + name + "</a><br>";
}

function checklist_process() { 
	let touchstartX = 0;
	let touchendX = 0;
	let width = screen.width / 2;
	let itemsList = document.getElementsByClassName('items');
	let titlesList = document.getElementsByClassName('sublist');
	let itemHighlight = itemsList[0];
	itemHighlight.classList.add('highlight');

	for (var i = 0; i < itemsList.length; i++) {
		itemsList[i].addEventListener('click', checklist_item_cross, false);

		itemsList[i].addEventListener('touchstart', function(event) { touchstartX = event.changedTouches[0].screenX; });

		itemsList[i].addEventListener('touchend', function(event) { 
			touchendX = event.changedTouches[0].screenX;
			if(touchstartX > touchendX) {
				if( (touchstartX - touchendX) > width) { 
					this.querySelector(".state").classList.remove('state-done');
					this.querySelector(".strike").style.opacity = "0";
					for(i =0; i < itemsList.length; i++) { itemsList[i].classList.remove('highlight'); }
					this.classList.add('highlight');
					
					if(this.nextElementSibling && this.nextElementSibling.classList.contains("comment")) { 
						this.nextElementSibling.classList.add("highlight");
						this.nextElementSibling.classList.remove("comment-strike");
					}
				}
			}
		});
	}

	for (var i = 0; i < titlesList.length; i++) { titlesList[i].addEventListener('dblclick', checklist_subcheckcross, false); }

	checklist_layout_load();
}

async function checklist_load_file(checklist_file) { 
	const checklist_obj = await fetch(checklist_file);
	let checklist = await checklist_obj.text();
  	let checklist_array = checklist.replace(/(\r\n|\n|\r)/gm, "|").split("|");
	checklist_load_items(checklist_array);
}

function checklist_load_items(array) {
	let i;
	let line_array;
	let c = 0;
	let l = array.length;
	let title_class = "title";
	let contentHTML = "";
	let title = "";
	let comment = "";
	let heading_id = "";
	let heading_id_cache = {};
	
	for(i = 0; i < array.length; i++) { 
		line_array = array[i].split("=");
		if(!line_array[1]) {

			if(line_array[0].substring(0,2) !== "**") { 
				// Title / Subtitle / Credits // 
				title_class = "title";

				if(c > 0) { contentHTML += "</div>"; }
				if(c == 0) { title_class = "title green"; }
				if(c == (l-1)) { title_class = "title blue"; }
			
				title = line_array[0];
				title = title.split("--").join('');
				heading_id = checklist_heading_id(title, heading_id_cache);
			
				contentHTML += "<div class='sublist'>";
				contentHTML += "<div class='" + title_class + "' id='" + heading_id + "' mode='dark'>" + title + "</div>";
			}

			if(line_array[0].substring(0,2) == "**") {
				// Comment // 
				comment = line_array[0];
				comment = comment.split("**").join('');
				contentHTML += "<div class='comment purple highlight' mode='dark'>" + comment + "</div>";
			}
			
		} else { 
			contentHTML += '<div class="items">';
			contentHTML += '<div class="strike" mode="dark"></div>';
			contentHTML += '<div class="item" mode="dark">' + line_array[0] +  '</div>';
			contentHTML += '<div class="state"mode="dark">'+ line_array[1] + '</div></div>';

		}
		c = c + 1;
	}
	content.innerHTML = contentHTML;
	checklist_process();
	checklist_sidebar_build();
}

