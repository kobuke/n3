const fs = require('fs');
let content = fs.readFileSync('README.md', 'utf8');

const thirdwebUpdate = `
### 🏦 Thirdweb Engine と Dynamic NFT 化対応
- **Shopify連携の刷新**: Crossmintへの移行を中止し、Thirdweb Engineによる自社管理(Backend Managed Wallet)でのNFT発行に一本化
- **Dynamic NFT実装**: チケット使用時(\`/api/use-ticket\`)、データベース上のステータス更新だけでなく、Thirdweb Engineを経由してオンチェーンのメタデータURIを書き換える(\`setTokenURI\`)機能を実装。これによりOpenSea等外部プラットフォームでも「使用済み」として表示される完全なWeb3体験を実現
- **キャッシュ対策**: Thirdwebのインデックスラグを解消するため、APIレベルでディープコピーを用いたローカルDB情報の即時マージ処理を実装
`;

content = content.replace('## 主な機能', '## 主な機能\n' + thirdwebUpdate);

fs.writeFileSync('README.md', content);
