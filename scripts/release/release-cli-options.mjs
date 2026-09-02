export function appendValueOption(target, option, value) {
  target.push(option, value);
}

export function setValueOption(target, option, value) {
  const optionIndex = target.indexOf(option);

  if (optionIndex !== -1) {
    target.splice(optionIndex, 2);
  }

  appendValueOption(target, option, value);
}

export function splitInlineOption(arg) {
  const equalsIndex = arg.indexOf("=");

  return equalsIndex === -1
    ? { option: arg, value: null }
    : {
        option: arg.slice(0, equalsIndex),
        value: arg.slice(equalsIndex + 1),
      };
}

export function readOptionValue(option, args, index, inlineValue) {
  if (inlineValue !== null) {
    return inlineValue;
  }

  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`${option} requires a value.`);
  }

  return value;
}

export function stripPnpmSeparator(args) {
  return args[0] === "--" ? args.slice(1) : args;
}
