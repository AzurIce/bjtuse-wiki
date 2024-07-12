const uml = className => {

  // Custom element to encapsulate Mermaid content.
  class MermaidDiv extends HTMLElement {

    /**
    * Creates a special Mermaid div shadow DOM.
    * Works around issues of shared IDs.
    * @return {void}
    */
    constructor() {
      super()

      // Create the Shadow DOM and attach style
      const shadow = this.attachShadow({mode: "open"})
      const style = document.createElement("style")
      style.textContent = `
      :host {
        display: block;
        line-height: initial;
        font-size: 16px;
      }
      div.diagram {
        margin: 0;
        overflow: visible;
      }`
      shadow.appendChild(style)
    }
  }

  if (typeof customElements.get("diagram-div") === "undefined") {
    customElements.define("diagram-div", MermaidDiv)
  }

  const getFromCode = parent => {
    // Handles <pre><code> text extraction.
    let text = ""
    for (let j = 0; j < parent.childNodes.length; j++) {
      const subEl = parent.childNodes[j]
      if (subEl.tagName.toLowerCase() === "code") {
        for (let k = 0; k < subEl.childNodes.length; k++) {
          const child = subEl.childNodes[k]
          const whitespace = /^\s*$/
          if (child.nodeName === "#text" && !(whitespace.test(child.nodeValue))) {
            text = child.nodeValue
            break
          }
        }
      }
    }
    return text
  }

  // We use this to determine if we want the dark or light theme.
  // This is specific for our MkDocs Material environment.
  // You should load your configs based on your own environment's needs.
  const defaultConfig = {
    startOnLoad: false,
    theme: "default",
    flowchart: {
      htmlLabels: false
    },
    er: {
      useMaxWidth: false
    },
    sequence: {
      useMaxWidth: false,
      noteFontWeight: "14px",
      actorFontSize: "14px",
      messageFontSize: "16px"
    },
    journey: {
      useMaxWidth: false
    },
    gitGraph: {
      useMaxWidth: false
    },
    gantt: {
      useMaxWidth: false
    }
  }
  mermaid.mermaidAPI.globalReset()
  // Non Material themes should just use "default"
  let scheme = null
  try {
    scheme = document.querySelector("[data-md-color-scheme]").getAttribute("data-md-color-scheme")
  } catch (err) {
    scheme = "default"
  }
  const config = (typeof mermaidConfig === "undefined") ?
    defaultConfig :
    mermaidConfig[scheme] || (mermaidConfig.default || defaultConfig)
  mermaid.initialize(config)

  // Find all of our Mermaid sources and render them.
  const blocks = document.querySelectorAll(`pre.${className}, diagram-div`)
  const surrogate = document.querySelector("html body")
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const parentEl = (block.tagName.toLowerCase() === "diagram-div") ?
      block.shadowRoot.querySelector(`pre.${className}`) :
      block

    // Create a temporary element with the typeset and size we desire.
    // Insert it at the end of our parent to render the SVG.
    const temp = document.createElement("div")
    temp.style.visibility = "hidden"
    temp.style.display = "display"
    temp.style.padding = "0"
    temp.style.margin = "0"
    temp.style.lineHeight = "initial"
    temp.style.fontSize = "16px"
    surrogate.appendChild(temp)

    try {
      mermaid.mermaidAPI.render(
        `_diagram_${i}`,
        getFromCode(parentEl),
        (content, fn) => {
          const el = document.createElement("div")
          el.className = className
          el.innerHTML = content
          if (fn) {
            fn(el)
          }

          // Insert the render where we want it and remove the original text source.
          // Mermaid will clean up the temporary element.
          const shadow = document.createElement("diagram-div")
          shadow.shadowRoot.appendChild(el)
          block.parentNode.insertBefore(shadow, block)
          parentEl.style.display = "none"
          shadow.shadowRoot.appendChild(parentEl)
          if (parentEl !== block) {
            block.parentNode.removeChild(block)
          }
        },
        temp
      )
    } catch (err) {} // eslint-disable-line no-empty

    if (surrogate.contains(temp)) {
      surrogate.removeChild(temp)
    }
  }
}

// This should be run on document load
(() => {
  let umlPromise = Promise.resolve()
  // let mathPromise = Promise.resolve()

  const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.type === "attributes") {
        let scheme = mutation.target.getAttribute("data-md-color-scheme")
        if (!scheme) {
          scheme = "default"
        }
        localStorage.setItem("data-md-color-scheme", scheme)
        if (typeof mermaid !== "undefined") {
          uml("diagram")
        }
      }
    })
  })

  const main = () => {
    observer.observe(document.querySelector("body"), {attributeFilter: ["data-md-color-scheme"]})

    if (typeof mermaid !== "undefined") {
      umlPromise = umlPromise.then(() => {
        uml("diagram")
      }).catch(err => {
        console.log(`UML loading failed...${err}`) // eslint-disable-line no-console
      })
    }
  }

  if (window.document$) {
    // Material specific hook
    window.document$.subscribe(main)
  } else {
    // Normal non-Material specific hook
    document.addEventListener("DOMContentLoaded", main)
  }
})()