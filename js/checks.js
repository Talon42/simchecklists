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
let checklist_layout_resize_listener = false;
let checklist_layout_wheel_listener = false;
let checklist_layout_scroll_listener = false;
let checklist_layout_wheel_lock = false;
let checklist_mobile_icons_listener = false;
let checklist_layout_snap_timer = null;

function checklist_mobile_icons_set_label(expanded) {
	let toggle = document.getElementById("icons_mobile_toggle");
	if(!toggle) { return; }
	toggle.textContent = "";
	toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
	toggle.setAttribute("aria-label", expanded ? "Hide tools" : "Show tools");
	toggle.setAttribute("title", expanded ? "Hide tools" : "Show tools");
}

function checklist_mobile_icons_toggle() {
	let chrome = document.getElementById("checklist_top_chrome");
	let expanded;
	if(!chrome) { return; }
	expanded = chrome.classList.toggle("icons-expanded");
	checklist_mobile_icons_set_label(expanded);
}

function checklist_mobile_icons_init() {
	let toggle = document.getElementById("icons_mobile_toggle");
	let chrome = document.getElementById("checklist_top_chrome");
	if(!toggle || !chrome || checklist_mobile_icons_listener) { return; }

	chrome.classList.remove("icons-expanded");
	checklist_mobile_icons_set_label(false);
	toggle.addEventListener("click", checklist_mobile_icons_toggle, false);
	toggle.addEventListener("keydown", function(event) {
		if(event.key == "Enter" || event.key == " ") {
			event.preventDefault();
			checklist_mobile_icons_toggle();
		}
	}, false);
	checklist_mobile_icons_listener = true;
}

function checklist_layout_is_two_column_desktop() {
	return checklist_layout_mode == "two";
}

function checklist_layout_current_page(content) {
	let page_width;
	let computed_style;
	let page_gap = 0;
	let page_stride;
	let max_left;
	let page_starts = [0];
	let next_start;
	let total_pages;
	let current_page = 1;
	let current_index = 0;
	let min_distance = Number.POSITIVE_INFINITY;

	if(!content || content.clientWidth <= 0) {
		return { current: 1, total: 1, width: 0, gap: 0, stride: 0, start: 0, end: 0, max: 0, starts: [0], index: 0 };
	}
	page_width = content.clientWidth;
	computed_style = window.getComputedStyle(content);
	page_gap = parseFloat(computed_style.columnGap) || 0;
	page_stride = page_width + page_gap;
	if(page_stride <= 0) { page_stride = page_width; }
	max_left = Math.max(0, content.scrollWidth - content.clientWidth);

	next_start = page_stride;
	while(next_start < max_left - 1) {
		page_starts.push(next_start);
		next_start += page_stride;
	}
	if(max_left > 0 && Math.abs(page_starts[page_starts.length - 1] - max_left) > 1) {
		page_starts.push(max_left);
	}

	total_pages = page_starts.length;
	page_starts.forEach(function(start, index) {
		let distance = Math.abs(content.scrollLeft - start);
		if(distance < min_distance) {
			min_distance = distance;
			current_index = index;
		}
	});
	current_page = current_index + 1;

	return {
		current: current_page,
		total: total_pages,
		width: page_width,
		gap: page_gap,
		stride: page_stride,
		start: page_starts[current_index],
		end: page_starts[current_index] + page_width,
		max: max_left,
		starts: page_starts,
		index: current_index
	};
}

function checklist_layout_get_persistent_title(content) {
	let title_el = document.getElementById("checklist_persistent_title");
	let current_mode = "dark";
	let top_chrome_inner = document.getElementById("checklist_top_chrome_inner");
	let title_parent = top_chrome_inner;

	if(!title_parent && content && content.parentNode) {
		title_parent = content.parentNode;
	}
	if(title_el || !title_parent) { return title_el; }
	if(document.body && document.body.getAttribute("mode")) {
		current_mode = document.body.getAttribute("mode");
	}

	title_el = document.createElement("div");
	title_el.id = "checklist_persistent_title";
	title_el.className = "title green checklist-persistent-title";
	title_el.setAttribute("mode", current_mode);
	title_parent.appendChild(title_el);
	return title_el;
}

function checklist_layout_update_top_chrome_offset() {
	let root = document.documentElement;
	let chrome = document.getElementById("checklist_top_chrome");
	let offset = 0;

	if(!root) { return; }
	if(chrome) {
		offset = Math.ceil(chrome.getBoundingClientRect().height);
	}
	root.style.setProperty("--single-page-top-offset", offset + "px");
}

function checklist_layout_update_pagination_indicator() {
	let content = document.getElementById("content");
	let main_title;
	let persistent_title;
	let page_info;
	let base_title;
	let normalized_title;

	if(!content) { return; }
	main_title = content.querySelector(".sublist > .title.green");
	persistent_title = checklist_layout_get_persistent_title(content);
	if(!main_title) {
		if(persistent_title) { persistent_title.style.display = "none"; }
		checklist_layout_update_top_chrome_offset();
		return;
	}

	if(!main_title.dataset.baseTitle || main_title.dataset.baseTitle === "") {
		normalized_title = main_title.textContent.trim().replace(/\s-\s\d+\/\d+$/, "");
		main_title.dataset.baseTitle = normalized_title;
	}
	base_title = main_title.dataset.baseTitle;

	if(!checklist_layout_is_two_column_desktop()) {
		main_title.textContent = base_title;
		main_title.style.display = "none";
		if(persistent_title) {
			persistent_title.textContent = base_title;
			persistent_title.style.display = "block";
		}
		checklist_layout_update_top_chrome_offset();
		return;
	}

	page_info = checklist_layout_current_page(content);
	main_title.style.display = "none";
	if(persistent_title) {
		persistent_title.textContent = base_title + " - " + page_info.current + "/" + page_info.total;
		persistent_title.style.display = "block";
	}
	checklist_layout_update_top_chrome_offset();
}

function checklist_layout_update_page_indicators() {
	checklist_layout_update_pagination_indicator();
}

function checklist_layout_snap_to_page() {
	let content = document.getElementById("content");
	let page_info;
	let target_left;

	if(!content || !checklist_layout_is_two_column_desktop()) { return; }
	page_info = checklist_layout_current_page(content);
	if(page_info.width <= 0) { return; }

	target_left = page_info.start;
	if(Math.abs(content.scrollLeft - target_left) <= 1) { return; }
	content.scrollTo({ left: target_left, behavior: "auto" });
}

function checklist_layout_schedule_snap() {
	if(checklist_layout_snap_timer) {
		window.clearTimeout(checklist_layout_snap_timer);
	}
	checklist_layout_snap_timer = window.setTimeout(function() {
		checklist_layout_snap_to_page();
		checklist_layout_update_page_indicators();
	}, 140);
}

function checklist_layout_handle_scroll() {
	checklist_layout_update_page_indicators();
	checklist_layout_schedule_snap();
}

function checklist_single_page_scroller() {
	return null;
}

function checklist_scroll_to_element(target) {
	let content = checklist_single_page_scroller();
	let content_rect;
	let target_rect;
	let next_top;

	if(content) {
		content_rect = content.getBoundingClientRect();
		target_rect = target.getBoundingClientRect();
		next_top = content.scrollTop + (target_rect.top - content_rect.top) - 10;
		if(next_top < 0) { next_top = 0; }
		content.scroll({ top: next_top, behavior: "smooth" });
		return;
	}

	window.scroll({top: target.getBoundingClientRect().top - 10 + window.scrollY, behavior: "smooth"});
}

function checklist_layout_wheel_scroll(event) {
	let content = document.getElementById("content");
	let page_info;
	let target_index;
	let target_left;
	let direction;

	if(!content || !checklist_layout_is_two_column_desktop()) { return; }
	if(event.ctrlKey || event.deltaY === 0) { return; }
	if(Math.abs(event.deltaY) < Math.abs(event.deltaX)) { return; }

	event.preventDefault();
	if(checklist_layout_wheel_lock) { return; }

	page_info = checklist_layout_current_page(content);
	if(page_info.starts.length <= 1) { return; }

	direction = event.deltaY > 0 ? 1 : -1;
	target_index = page_info.index + direction;
	if(target_index < 0) { target_index = 0; }
	if(target_index >= page_info.starts.length) { target_index = page_info.starts.length - 1; }
	target_left = page_info.starts[target_index];
	if(target_left == content.scrollLeft) { return; }

	checklist_layout_wheel_lock = true;
	content.scrollTo({ left: target_left, behavior: "smooth" });
	window.setTimeout(function() { checklist_layout_wheel_lock = false; }, 280);
}

function checklist_layout_set_viewport_height() {
	let content = document.getElementById("content");
	let root = document.documentElement;
	let footer = document.querySelector(".footer");
	let computed_style;
	let padding_bottom = 0;
	let footer_offset = 0;
	let rect;
	let available_height;

	if(!content) { return 0; }
	if(checklist_layout_mode != "two") {
		content.style.height = "";
		content.style.maxHeight = "";
		if(root) { root.style.setProperty("--two-column-footer-offset", "0px"); }
		return 0;
	}

	computed_style = window.getComputedStyle(content);
	padding_bottom = parseFloat(computed_style.paddingBottom) || 0;
	if(document.body && document.body.classList.contains("two-column-view") && footer) {
		footer_offset = Math.ceil(footer.getBoundingClientRect().height) + 12;
	}
	if(root) {
		root.style.setProperty("--two-column-footer-offset", footer_offset + "px");
	}
	rect = content.getBoundingClientRect();
	available_height = Math.floor(window.innerHeight - rect.top - padding_bottom - footer_offset);

	if(available_height < 200) { available_height = 200; }
	content.style.height = available_height + "px";
	content.style.maxHeight = available_height + "px";
	return available_height;
}

function checklist_layout_mark_oversized_sections(column_height) {
	let content = document.getElementById("content");
	let sections;
	let effective_height = 0;

	if(!content) { return; }
	sections = Array.from(content.getElementsByClassName("sublist"));

	if(checklist_layout_mode != "two") {
		sections.forEach(function(section) { section.classList.remove("oversized"); });
		return;
	}

	effective_height = column_height || content.clientHeight;
	if(effective_height <= 0) { return; }
	sections.forEach(function(section) {
		section.classList.toggle("oversized", section.scrollHeight > effective_height);
	});
}

function checklist_layout_handle_resize() {
	let column_height = checklist_layout_set_viewport_height();
	checklist_layout_mark_oversized_sections(column_height);
	checklist_layout_snap_to_page();
	checklist_layout_update_top_chrome_offset();
	checklist_sidebar_align();
	checklist_layout_update_page_indicators();
}

function checklist_layout_apply() {
	let content = document.getElementById("content");
	let layout_buttons;
	let layout_icon = "layout-one";

	if(!content) { return; }
	if(checklist_layout_mode == "two") { layout_icon = "layout-two"; }

	content.classList.toggle("two-column-layout", checklist_layout_mode == "two");
	if(document.body) {
		document.body.classList.toggle("single-page-view", checklist_layout_mode == "one");
		document.body.classList.toggle("two-column-view", checklist_layout_mode == "two");
	}
	checklist_layout_handle_resize();
	sessionStorage.setItem("checklist_layout", checklist_layout_mode);

	layout_buttons = document.querySelectorAll('.layout_icon');
	layout_buttons.forEach(function(btn) {
		btn.setAttribute("icon", layout_icon);
		btn.innerHTML = iconRender(layout_icon);
	});
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
	let content = document.getElementById("content");

	if(sessionStorage.getItem("checklist_layout") !== null) {
		checklist_layout_mode = sessionStorage.getItem("checklist_layout");
	}
	if(checklist_layout_mode !== "two") { checklist_layout_mode = "one"; }

	if(!checklist_layout_listeners) {
		layout_buttons = document.querySelectorAll('.layout_switch');
		layout_buttons.forEach(function(btn) { btn.addEventListener('click', checklist_layout_switch, false); });
		checklist_layout_listeners = true;
	}
	if(!checklist_layout_resize_listener) {
		window.addEventListener("resize", checklist_layout_handle_resize);
		checklist_layout_resize_listener = true;
	}
	if(!checklist_layout_wheel_listener && content) {
		content.addEventListener("wheel", checklist_layout_wheel_scroll, { passive: false });
		checklist_layout_wheel_listener = true;
	}
	if(!checklist_layout_scroll_listener && content) {
		content.addEventListener("scroll", checklist_layout_handle_scroll, false);
		checklist_layout_scroll_listener = true;
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

function checklist_sidebar_align() {
	let sidebar = document.getElementById("checklist_sidebar");
	let content = document.getElementById("content");
	let sidebar_width = 220;
	let sidebar_gap = 20;
	let top_offset = 10;
	let left_offset;

	if(!sidebar || !content) { return; }

	top_offset = Math.round(content.getBoundingClientRect().top);
	if(top_offset < 10) { top_offset = 10; }

	left_offset = content.getBoundingClientRect().left - sidebar_width - sidebar_gap;
	if(left_offset < 10) { left_offset = 10; }

	sidebar.style.position = "fixed";
	sidebar.style.top = top_offset + "px";
	sidebar.style.left = left_offset + "px";
	sidebar.style.width = sidebar_width + "px";
	sidebar.style.marginTop = "0";
	sidebar.style.maxHeight = "calc(100vh - " + (top_offset + 10) + "px)";
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
		link.dataset.sectionId = heading.id;
		link.href = "#" + heading.id;
		link.textContent = heading.textContent;
		link.addEventListener("click", function(event) {
			event.preventDefault();
			checklist_sidebar_focus_section(heading.id);
			if(window.history && window.history.replaceState) {
				window.history.replaceState(null, "", "#" + heading.id);
			} else {
				window.location.hash = heading.id;
			}
		});
		links_el.appendChild(link);
	});

	sidebar.appendChild(links_el);
	checklist_sidebar_update_section_completion();
	checklist_layout_handle_resize();
}

function checklist_sidebar_focus_section(section_id) {
	let content = document.getElementById("content");
	let heading;
	let target;
	let page_info;
	let content_rect;
	let target_rect;
	let target_left;
	let target_anchor;
	let target_index = 0;
	let i;

	if(!content || !section_id) { return; }
	heading = document.getElementById(section_id);
	if(!heading || !content.contains(heading)) { return; }
	target = heading.closest(".sublist") || heading;

	if(!checklist_layout_is_two_column_desktop()) {
		checklist_scroll_to_element(target);
		checklist_layout_update_page_indicators();
		return;
	}

	page_info = checklist_layout_current_page(content);
	if(page_info.starts.length <= 1) {
		content.scrollTo({ left: 0, behavior: "smooth" });
		checklist_layout_update_page_indicators();
		return;
	}

	content_rect = content.getBoundingClientRect();
	target_rect = target.getBoundingClientRect();
	target_left = content.scrollLeft + (target_rect.left - content_rect.left);
	target_anchor = target_left + (Math.max(1, target_rect.width) / 2);

	for(i = 0; i < page_info.starts.length; i++) {
		if(target_anchor >= page_info.starts[i]) {
			target_index = i;
		} else {
			break;
		}
	}

	content.scrollTo({ left: page_info.starts[target_index], behavior: "smooth" });
	checklist_layout_update_page_indicators();
}

function checklist_sidebar_update_section_completion() {
	let sidebar = document.getElementById("checklist_sidebar");
	let sections = Array.from(document.querySelectorAll("#content .sublist"));

	if(!sidebar || sections.length === 0) { return; }

	sections.forEach(function(section) {
		let heading = section.querySelector(".title");
		let link;
		let items;
		let all_done;

		if(!heading || !heading.id) { return; }
		link = sidebar.querySelector('.sidebar-link[data-section-id="' + heading.id + '"]');
		if(!link) { return; }

		items = Array.from(section.querySelectorAll(".items"));
		all_done = items.length > 0 && items.every(function(item) {
			return item.classList.contains("items-done");
		});
		link.classList.toggle("sidebar-link-done", all_done);
	});
}

function checklist_item_cross() {
	let itemsList = document.getElementsByClassName('items');
	let isDone = this.classList.contains('items-done');
	let content = checklist_single_page_scroller();
	let content_rect;
	let scroll_trigger;
	
	// Clear all highlights
	Array.from(itemsList).forEach(item => item.classList.remove('highlight'));
	
	// Toggle this item
	toggleItemState(this, !isDone);
	checklist_sidebar_update_section_completion();
	
	// If unchecking, highlight this item and return
	if(isDone) {
		this.classList.add('highlight');
		return;
	}
	
	// Scroll if needed
	if(content) {
		content_rect = content.getBoundingClientRect();
		scroll_trigger = content_rect.top + (content.clientHeight * 0.65);
		if(this.getBoundingClientRect().top > scroll_trigger) {
			checklist_scroll_to_element(this);
		}
	} else if(this.getBoundingClientRect().top > screen.height * 0.65) {
		checklist_scroll_to_element(this);
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

function checklist_subcheckcross(section) {
	// Get all item children
	let items = Array.from(section.querySelectorAll('.items'));
	if(items.length === 0) return;

	// Determine if we should mark done (if ANY are unchecked)
	let shouldMarkDone = items.some(item => !item.classList.contains('items-done'));

	// Toggle all items
	items.forEach(item => {
		item.classList.remove('highlight');
		toggleItemState(item, shouldMarkDone);
	});
	checklist_sidebar_update_section_completion();

	// Highlight first unchecked item
	let allItems = document.querySelectorAll('.item');
	for(let item of allItems) {
		if(!item.classList.contains('items-done')) {
			item.parentNode.classList.add('highlight');
			break;
		}
	}
}

function checklist_section_cross(event) {
	let title = event.currentTarget;
	let section;

	if(!title) { return; }
	if(title.classList.contains("green") || title.classList.contains("blue")) { return; }
	if(event.target.classList.contains('items') || event.target.closest('.items')) {
		return;
	}

	section = title.parentElement;
	if(!section || !section.classList.contains("sublist")) { return; }
	checklist_subcheckcross(section);
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
	let titlesList = document.querySelectorAll('.sublist > .title');
	let itemHighlight = itemsList[0];
	itemHighlight.classList.add('highlight');

	for (var i = 0; i < itemsList.length; i++) {
		itemsList[i].addEventListener('click', checklist_item_cross, false);

		itemsList[i].addEventListener('touchstart', function(event) { touchstartX = event.changedTouches[0].screenX; });

		itemsList[i].addEventListener('touchend', function(event) { 
			touchendX = event.changedTouches[0].screenX;
			if(touchstartX > touchendX) {
				if( (touchstartX - touchendX) > width) { 
					toggleItemState(this, false);
					checklist_sidebar_update_section_completion();
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

	for (var i = 0; i < titlesList.length; i++) { titlesList[i].addEventListener('click', checklist_section_cross, false); }

	checklist_mobile_icons_init();
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

