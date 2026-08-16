const Logo = ({ 
  size = "size-9", 
  showText = true, 
  textSize = "text-2xl",
  containerClass = ""
}) => {
  return (
    <div className={`flex items-center gap-2.5 ${containerClass}`}>
      <img 
        src="/talkhub.svg" 
        alt="TalkHub Logo" 
        className={`${size} rounded-xl shadow-lg`}
      />
      {showText && (
        <span className={`${textSize} font-bold font-mono bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary tracking-wider`}>
          TalkHub
        </span>
      )}
    </div>
  );
};

export default Logo;