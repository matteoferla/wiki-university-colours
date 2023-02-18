class University {
/**
     * Create a university.
     * @param {string} prefix - The prefix to use for element IDs.
     * @param {HTMLElement} container - The container element to append the university elements to.
     * @param {boolean} [img_required=false] - Whether an image is required for the university.
     * @param {string} [description=''] - description contents
     * @member {string} prefix - The prefix to use for element IDs.
     * @member {string} name - The name of the university.
     * @member {string} image_name - The name of the university's image.
     * @member {string} svg_url - The URL of the SVG for the university.
     * @member {string} svg_block - The XML string of the SVG for the university.
     * @member {Set<string>} colors - The colours associated with the university.
     * @member {string} selected_color - The colour chosen by the user
     * @member {boolean} img_required - Whether an image is required for the university.
     * @member {HTMLElement} container - The container element to append the university elements to.
     * @member {HTMLInputElement} text_input - The input element for the university name.
     * @member {HTMLDivElement} options_div - The div containing the matching university buttons.
     * @member {HTMLDivElement} svg_div - The div containing the SVG for the university.
     * @member {HTMLDivElement} color_radios - The div containing the color radio buttons.
 */
    constructor(prefix, container, description='', img_required=false) {
        this.prefix = prefix;

        
        this.name = '';
        this.image_name = '';
        this.svg_url = '';
        this.svg_block = '';
        this.colors = new Set();
        this.selected_color = '';
        this.img_required = img_required;

        /// make elements
        if (!(container instanceof HTMLElement)) {
            throw new Error('container not a HTMLElement');
        }
        this.container = container;
        
        if (!! description) {
            let p = document.createElement('p');
            p.innerHTML = description;
            this.container.appendChild(p);
        }
        
        this.text_input = document.createElement('input');
        this.text_input.setAttribute('type', 'text');
        this.text_input.setAttribute('id', this.prefix + 'uni_input');
        this.text_input.addEventListener("input", this.activate_input.bind(this));
        this.container.appendChild(this.text_input);

        this.options_div = document.createElement('div');
        this.options_div.setAttribute('id', this.prefix + 'uni_options');
        this.container.appendChild(this.options_div);
        
        this.svg_div = document.createElement('div');
        this.svg_div.id = this.prefix + 'svg_div';
        this.container.appendChild(this.svg_div);

        this.color_radios = document.createElement('div');
        this.color_radios.id = this.prefix + 'color_radios';
        this.color_radios.setAttribute('name', this.prefix+'colors');
        this.container.appendChild(this.color_radios);
    }

    activate_input() {
        // ``this.options_div`` contains the possible matches of ``this.text_input``
            // Clear the div to remove previous buttons
            this.options_div.innerHTML = "";
            this.svg_div.innerHTML = "";
            this.color_radios.innerHTML = '';

            // Filter the universities array to get the matches based on input value
            const matches = universities.filter(uni =>
                uni.name.toLowerCase().includes(this.text_input.value.toLowerCase())
            );

            // Loop through the filtered matches and add a button for each match
            //console.log(matches);
            matches.slice(0, 10).forEach(uni => {
                const button = document.createElement("button");
                button.innerHTML = uni.name;
                button.style.backgroundColor = uni.colors.length ? uni.colors[0] : 'white';
                button.dataset.name = uni.name;
                button.dataset.colors = JSON.stringify(uni.colors);
                button.dataset.image_name = uni.image_name;
                if (this.img_required && uni.image_name === '') {
                    button.disabled = true;
                }
                button.addEventListener("click", this.button_onclick.bind(this));
                this.options_div.appendChild(button);
            });
        }

        button_onclick(event) {
                const button = event.target;
                this.name = button.dataset.name;
                this.image_name = button.dataset.image_name;
                JSON.parse(button.dataset.colors).map(s => s.toUpperCase()).forEach(this.colors.add, this.colors);
                this.update_colors();
                
                const api_url = 'https://en.wikipedia.org/w/api.php?action=query&prop=imageinfo&iiprop=url&format=json&origin=*&titles=Image:'
                this.svg_url = api_url + escape(button.dataset.image_name);
                fetch(api_url + escape(button.dataset.image_name))
                    .then(response => response.json())
                    .then(data => {
                        this.svg_url = Object.values(data.query.pages)[0].imageinfo[0].url;
                        if (this.svg_url.match(/svg$/)) {
                            fetch(this.svg_url)
                                .then(r => r.text())
                                .then(this.load_svg.bind(this));
                        }
                        else if (! this.img_required) {
                            //pass
                        }
                        else {
                            alert('Sorry, not an svg, try different target.')
                            throw new Error('not an svg');
                        }
                    });
            }
       
       load_svg(svg) {
                        this.svg_div.innerHTML = svg;
                        this.svg_block = svg;
                        // # the regex litteral /#[0-9A-F]{6}/gi causes issues with the notebook as it thinks its python
                        [...svg.matchAll(new RegExp('#[0-9A-F]{6}', 'gi'))]
                                               .map(a => a[0].toUpperCase())
                                               .forEach(this.colors.add, this.colors);
                        this.update_colors();
                    }
                          
      update_colors() {
            this.color_radios.innerHTML = '';
            this.colors.forEach(color => {
                const clean = this.prefix+color.replace('#', 'color');
                const l = document.createElement('label');
                l.innerHTML = color;
                l.style.color = color;
                l.setAttribute('for', clean);
                const o = document.createElement('input');
                o.setAttribute("type", "radio");
                o.setAttribute('value', color);
                o.setAttribute('name', this.prefix+'colors');
                o.setAttribute('name', clean);
                o.addEventListener('change', (event) => { if (event.target.checked) {this.selected_color = color}});
                this.color_radios.appendChild(o);
                this.color_radios.appendChild(l);
            });
      }   
}
class UniCombineColor {
    constructor(container) {
        this.container = container;
        this.image_donor = new University('image', this.container, 'Select the university for the SVG image and the color to replace', true)
        this.color_donor = new University('color', this.container, 'Select the university for the colour to use with the image of the other university', false)
        this.svg_collage_block = '';
        this.combo_button = document.createElement('button');
        this.combo_button.innerHTML = 'Combine';
        this.combo_button.addEventListener('click', this.combine.bind(this));
        this.container.appendChild(this.combo_button);
        this.out_div = document.createElement('div');
        this.container.appendChild(this.out_div);
    }
    
    combine(event) {
        this.out_div.innerHTML = '';
        if (! this.image_donor.svg_block) {
            this.out_div.innerHTML = '<span>Error: select an image donor!</span>';
        }
        else if (! this.image_donor.selected_color) {
            this.out_div.innerHTML = '<span>Error: select a colour from the image donor!</span>';
        }
        else if (! this.image_donor.selected_color) {
            this.out_div.innerHTML = '<span>Error: select a colour from the colour donor!</span>';
        }
        else {
            this.svg_collage_block = this.image_donor.svg_block.replace(new RegExp(this.image_donor.selected_color, 'gi'), this.color_donor.selected_color);
            this.out_div.innerHTML = this.svg_collage_block;
        }
    }
}

export { University, UniCombineColor };